// src/controllers/ventasController.js
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  Venta,
  VentaDetalle,
  Producto,
  Cliente,
  ConfiguracionEmpresa,
  CierreGlobal,
  CierreGlobalDetalle,
  MovimientoCaja,
  Mesa,
  Pedido,
  PedidoDetalle
} = require('../models');
const { registrarMovimientoInventario } = require('../services/inventarioService');
const { registrarMovimiento } = require('../utils/inventario');
const generarTicketPDF = require('../utils/ticketGenerator');

// --- Helpers ---
const findConsumidorFinal = (transaction) => {
  return Cliente.findOne({
    where: {
      [Op.or]: [{ ruc: '0' }, { ruc: 'X' }, { nombre: 'Consumidor Final' }]
    },
    transaction
  });
};

const findVentaCompletaById = (id, transactionOptions = {}) => {
  return Venta.findByPk(id, {
    include: [
      {
        model: VentaDetalle,
        as: 'detallesDeVenta',
        include: [{ model: Producto, as: 'producto' }]
      },
      { model: Cliente, as: 'cliente' }
    ],
    ...transactionOptions
  });
};

// 🚀 Crear venta (soporta pedido_id para Mesas/Delivery/Terraza)
const crearVenta = async (req, res) => {
  const {
    detalles,
    pedido_id = null,
    metodo_pago = 'efectivo',
    cliente_id: clienteIdRecibido = null,
    usuario_id = null
  } = req.body;

  const t = await sequelize.transaction();
  try {
    // 1) Cliente
    let clienteParaVentaId = clienteIdRecibido;
    if (!clienteParaVentaId) {
      const cf = await findConsumidorFinal(t);
      if (!cf) throw new Error('Cliente "Consumidor Final" no encontrado.');
      clienteParaVentaId = cf.id;
    }

    // 2) Numeración de factura
    const configEmpresa = await ConfiguracionEmpresa.findByPk(1, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!configEmpresa) throw new Error('Configuración de la empresa no encontrada.');
    const prefijo = (configEmpresa.prefijoFactura ?? '001-001').trim();
    const last = Number(configEmpresa.ultimoCorrelativoFactura ?? 0);
    const next = last + 1;
    configEmpresa.ultimoCorrelativoFactura = next;
    const numeroFacturaCompleto = `${prefijo}-${String(next).padStart(7, '0')}`;
    await configEmpresa.save({ transaction: t });

    // 3) Determinar ítems de la venta
    let lineasVenta = [];
    let costoEnvio = 0;
    let mesaId = null;

    if (pedido_id) {
      const rows = await sequelize.query(
        `
        SELECT d.producto_id,
               SUM(d.cantidad)       AS cantidad,
               MAX(d.precio_unitario) AS precio_unitario,
               SUM(d.subtotal)        AS subtotal
        FROM pedido_detalles d
        WHERE d.pedido_id = :pedido_id
        GROUP BY d.producto_id
        `,
        { replacements: { pedido_id }, type: sequelize.QueryTypes.SELECT, transaction: t }
      );
      if (!rows.length) throw new Error('El pedido no tiene ítems para facturar.');
      lineasVenta = rows.map(r => ({
        producto_id: r.producto_id,
        cantidad: Number(r.cantidad),
        precio_unitario: Number(r.precio_unitario),
        subtotal: Number(r.subtotal),
      }));
      
      const ped = await Pedido.findByPk(pedido_id, { transaction: t });
      if (!ped) throw new Error('Pedido no encontrado.');
      costoEnvio = Number(ped.costo_envio || 0);
      // Soporta mesa o terraza
      mesaId = (ped.tipo === 'mesa' || ped.tipo === 'terraza') ? ped.mesa_id : null;
    } else {
      if (!detalles || detalles.length === 0) {
        await t.rollback();
        return res.status(400).json({ error: 'La venta debe incluir al menos un producto.' });
      }
      lineasVenta = detalles.map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.precio_unitario * d.cantidad,
      }));
    }

    // 4) Validar stock
    const productoIds = lineasVenta.map(d => d.producto_id);
    const productosEnVenta = await Producto.findAll({
      where: { id: { [Op.in]: productoIds } },
      transaction: t
    });
    const productosMap = new Map(productosEnVenta.map(p => [p.id, p]));
    for (const item of lineasVenta) {
      const p = productosMap.get(item.producto_id);
      if (!p) throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
      if (p.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${p.nombre}. Solicitado: ${item.cantidad}, Disponible: ${p.stock}`);
      }
    }

    // 5) Crear Venta
    const totalItems = lineasVenta.reduce((acc, d) => acc + d.subtotal, 0);
    const totalCalculado = totalItems + costoEnvio;
    const venta = await Venta.create({
      total: totalCalculado,
      metodo_pago,
      cliente_id: clienteParaVentaId,
      usuario_id,
      estado: 'activa',
      numero_factura: numeroFacturaCompleto,
      fecha: new Date(),
      pedido_id: pedido_id || null,
      costo_envio: costoEnvio,
    }, { transaction: t });

    // 6) Crear VentaDetalle en bulk
    const detallesParaCrear = lineasVenta.map(item => ({
      venta_id: venta.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }));
    await VentaDetalle.bulkCreate(detallesParaCrear, { transaction: t });

    // 7) Descontar stock + movimientos
    await Promise.all(lineasVenta.map(async (item) => {
      const p = productosMap.get(item.producto_id);
      const nuevoStock = p.stock - item.cantidad;
      await Producto.update(
        { stock: nuevoStock },
        { where: { id: item.producto_id }, transaction: t }
      );
      const descripcion = `Venta ID ${venta.id} - Factura No. ${numeroFacturaCompleto}`;
      await registrarMovimientoInventario(
        { producto_id: item.producto_id, tipo: 'salida', motivo: 'venta', cantidad: item.cantidad, descripcion, usuario_id },
        { transaction: t }
      );
      await registrarMovimiento(
        { producto_id: item.producto_id, tipo: 'SALIDA', cantidad: item.cantidad, descripcion, referencia_id: venta.id, referencia_tipo: 'VENTA' },
        { transaction: t }
      );
    }));

    // 8) Si viene de pedido: cerrar y liberar mesa si corresponde
    if (pedido_id) {
      await Pedido.update(
        { estado: 'cobrado', closed_at: new Date() },
        { where: { id: pedido_id }, transaction: t }
      );
      if (mesaId) {
        await Mesa.update({ estado: 'libre' }, { where: { id: mesaId }, transaction: t });
      }
    }

    await t.commit();
    return res.status(201).json({
      message: 'Venta registrada exitosamente.',
      id: venta.id,
      numero_factura: venta.numero_factura
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al registrar venta:', error);
    const statusCode =
      error.message.includes('Stock insuficiente') ||
      error.message.includes('no encontrado') ||
      error.message.includes('ítems para facturar')
        ? 400
        : 500;
    return res
      .status(statusCode)
      .json({ error: 'Error al registrar la venta.', details: error.message });
  }
};

const listarVentas = async (req, res) => {
  const { desde, hasta, cliente_id, estado, includeDetails, includeClient, q, tipo } = req.query;

  const page = Number(req.query.page || 0);
  const pageSize = Number(req.query.pageSize || 0);

  const where = {};
  if (desde || hasta) {
    if (desde && hasta) where.fecha = { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] };
    else if (desde)     where.fecha = { [Op.gte]: `${desde} 00:00:00` };
    else                where.fecha = { [Op.lte]: `${hasta} 23:59:59` };
  }
  if (cliente_id) where.cliente_id = cliente_id;
  if (estado)     where.estado = estado;

  const include = [
    { model: Cliente, as: 'cliente', required: false, attributes: ['id', 'nombre', 'ruc'] },
    {
      model: Pedido,
      as: 'pedido',
      required: false,
      attributes: ['id', 'tipo', 'delivery_telefono', 'delivery_direccion', 'delivery_referencia', 'delivery_nombre', 'estado', 'costo_envio']
    }
  ];

  // tipo: delivery/mesa/terraza/mostrador
  if (tipo === 'delivery') {
    include[1].where = { tipo: 'delivery' };
    include[1].required = true;
  } else if (tipo === 'mesa') {
    include[1].where = { tipo: 'mesa' };
    include[1].required = true;
  } else if (tipo === 'terraza') {
    include[1].where = { tipo: 'terraza' };
    include[1].required = true;
  } else if (tipo === 'mostrador') {
    where.pedido_id = { [Op.is]: null };
  }

  if (q && String(q).trim() !== '') {
    const like = { [Op.iLike]: `%${q}%` };
    where[Op.or] = [
      { '$cliente.nombre$': like },
      { '$cliente.ruc$': like },
      { '$pedido.delivery_telefono$': like },
      { '$pedido.delivery_direccion$': like },
      { '$pedido.delivery_referencia$': like },
      { '$pedido.delivery_nombre$': like }
    ];
  }

  if (includeDetails === 'true') {
    include.push({
      model: VentaDetalle,
      as: 'detallesDeVenta',
      include: [{ model: Producto, as: 'producto' }]
    });
  }

  try {
    const baseOptions = {
      where,
      include,
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      attributes: ['id','fecha','total','metodo_pago','estado','numero_factura','cliente_id','pedido_id','costo_envio'],
      subQuery: false
    };

    if (!page || !pageSize) {
      const ventas = await Venta.findAll(baseOptions);
      return res.json(ventas);
    }

    const limit = Math.min(pageSize, 5000);
    const offset = (Math.max(page, 1) - 1) * limit;

    const { rows, count } = await Venta.findAndCountAll({ ...baseOptions, limit, offset, distinct: true });
    const totalPages = Math.max(1, Math.ceil(count / limit));

    return res.json({
      data: rows,
      page: Math.max(page, 1),
      pageSize: limit,
      total: count,
      totalPages
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return res.status(500).json({ error: 'Error interno al obtener ventas.', details: error.message });
  }
};

const resumenVentas = async (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Parámetros "desde" y "hasta" son obligatorios (YYYY-MM-DD).' });
  }

  try {
    const whereClause = {
      fecha: { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] },
      estado: { [Op.ne]: 'anulado' }
    };

    const totales = await Venta.findAll({
      where: whereClause,
      attributes: [
        [fn('COUNT', col('id')), 'cantidad_ventas'],
        [fn('SUM', col('total')), 'total_general']
      ],
      raw: true
    });
    const total_general = Number(totales[0]?.total_general || 0);
    const cantidad_ventas = Number(totales[0]?.cantidad_ventas || 0);
    const ticket_promedio = cantidad_ventas > 0 ? Math.round(total_general / cantidad_ventas) : 0;

    const porMetodoRows = await Venta.findAll({
      where: whereClause,
      attributes: ['metodo_pago', [fn('SUM', col('total')), 'monto']],
      group: ['metodo_pago'],
      order: [[fn('SUM', col('total')), 'DESC']],
      raw: true
    });
    const por_metodo = {};
    porMetodoRows.forEach(r => { por_metodo[r.metodo_pago] = Number(r.monto || 0); });

    const porTipoSql = `
      SELECT
        COALESCE(p.tipo, 'mostrador') AS tipo,
        SUM(v.total)::bigint AS monto
      FROM ventas v
      LEFT JOIN pedidos p ON p.id = v.pedido_id
      WHERE v.estado <> 'anulado'
        AND v.fecha BETWEEN :desdeIni AND :hastaFin
      GROUP BY COALESCE(p.tipo, 'mostrador')
      ORDER BY 2 DESC;
    `;
    const porTipoRows = await sequelize.query(porTipoSql, {
      replacements: { desdeIni: `${desde} 00:00:00`, hastaFin: `${hasta} 23:59:59` },
      type: sequelize.QueryTypes.SELECT
    });
    const por_tipo = {};
    porTipoRows.forEach(r => { por_tipo[r.tipo] = Number(r.monto || 0); });

    return res.json({
      rango: { desde, hasta },
      total_general,
      cantidad_ventas,
      ticket_promedio,
      por_metodo,
      por_tipo
    });
  } catch (error) {
    console.error('Error en resumenVentas:', error);
    return res.status(500).json({ error: 'Error interno al calcular el resumen.', details: error.message });
  }
};

const obtenerVentaPorId = async (req, res) => {
  try {
    const venta = await findVentaCompletaById(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ error: 'Error interno al obtener venta.' });
  }
};

const generarFacturaPDF = async (req, res) => {
  try {
    const venta = await findVentaCompletaById(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    const configEmpresa = await ConfiguracionEmpresa.findByPk(1);
    if (!configEmpresa) {
      return res.status(500).json({ error: 'Configuración de la empresa no encontrada.' });
    }
    await generarTicketPDF(
      venta,
      venta.cliente,
      venta.detallesDeVenta,
      configEmpresa,
      res
    );
  } catch (error) {
    console.error('Error al generar ticket PDF:', error);
    res.status(500).json({ error: 'Error al generar ticket PDF', details: error.message });
  }
};

const anularVenta = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const venta = await Venta.findByPk(id, {
      include: [
        { model: VentaDetalle, as: 'detallesDeVenta' },
        { model: Cliente, as: 'cliente' }
      ],
      transaction: t
    });
    if (!venta) throw new Error('Venta no encontrada.');
    if (venta.estado === 'anulado') throw new Error('Esta venta ya ha sido anulada.');

    await Promise.all(
      venta.detallesDeVenta.map(async (detalle) => {
        await Producto.increment('stock', {
          by: detalle.cantidad,
          where: { id: detalle.producto_id },
          transaction: t
        });
        const descripcion = `Anulación Venta ID ${venta.id} - Factura No. ${venta.numero_factura ?? 'N/A'}`;
        await registrarMovimientoInventario(
          { producto_id: detalle.producto_id, tipo: 'entrada', motivo: 'anulacion_venta', cantidad: detalle.cantidad, descripcion, usuario_id: req.usuario ? req.usuario.id : null },
          { transaction: t }
        );
        await registrarMovimiento(
          { producto_id: detalle.producto_id, tipo: 'ENTRADA', cantidad: detalle.cantidad, descripcion, referencia_id: venta.id, referencia_tipo: 'ANULACION_VENTA' },
          { transaction: t }
        );
      })
    );

    switch (venta.metodo_pago) {
      case 'efectivo':
        await MovimientoCaja.create(
          {
            tipo: 'egreso',
            monto: venta.total,
            descripcion: `Reembolso por anulación de Factura #${venta.numero_factura ?? 'N/A'} (Efectivo)`,
            fecha: new Date(),
            venta_id: venta.id,
            usuario_id: req.usuario ? req.usuario.id : null
          },
          { transaction: t }
        );
        break;
      case 'tarjeta':
      case 'transferencia':
        await MovimientoCaja.create(
          {
            tipo: 'egreso',
            monto: venta.total,
            descripcion: `Reembolso por anulación de Factura #${venta.numero_factura ?? 'N/A'} (Medio: ${venta.metodo_pago})`,
            fecha: new Date(),
            venta_id: venta.id,
            usuario_id: req.usuario ? req.usuario.id : null
          },
          { transaction: t }
        );
        break;
      case 'credito':
        if (venta.cliente && venta.cliente.id !== (await findConsumidorFinal(t))?.id) {
          await venta.cliente.decrement('saldo_pendiente', { by: venta.total, transaction: t });
        }
        break;
      default:
        break;
    }

    venta.estado = 'anulado';
    venta.fecha_anulacion = new Date();
    await venta.save({ transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Venta anulada exitosamente, stock devuelto y movimiento de dinero registrado.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al anular la venta:', error);
    const statusCode = error.message.includes('encontrada') || error.message.includes('anulada') ? 400 : 500;
    return res.status(statusCode).json({ message: 'Error al anular la venta.', details: error.message });
  }
};

const generarArqueo = async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.status(400).json({ message: 'La fecha es obligatoria.' });
  }
  try {
    const consumidorFinalCliente = await findConsumidorFinal();
    if (!consumidorFinalCliente) {
      return res.status(404).json({ message: 'Cliente "Consumidor Final" no configurado.' });
    }
    const fechaInicio = `${fecha} 00:00:00`;
    const fechaFin = `${fecha} 23:59:59`;
    const whereClause = {
      cliente_id: consumidorFinalCliente.id,
      estado: 'activa',
      fecha: { [Op.between]: [fechaInicio, fechaFin] },
      id: {
        [Op.notIn]: literal(`(SELECT venta_id FROM cierre_global_detalles WHERE cierre_global_id IS NOT NULL)`)
      }
    };
    const ventasNoIdentificadas = await Venta.findAll({
      where: whereClause,
      attributes: ['id', 'fecha', 'metodo_pago', 'total', 'numero_factura'],
      order: [['fecha', 'ASC']]
    });
    const totalesPorMetodo = await Venta.findAll({
      where: whereClause,
      attributes: ['metodo_pago', [fn('SUM', col('total')), 'total_monto']],
      group: ['metodo_pago']
    });
    const resumenTotales = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    let totalGeneral = 0;
    totalesPorMetodo.forEach((item) => {
      const metodo = item.getDataValue('metodo_pago');
      const total = parseFloat(item.getDataValue('total_monto'));
      if (resumenTotales[metodo] !== undefined) {
        resumenTotales[metodo] = total;
      }
      totalGeneral += total;
    });
    return res.json({
      fecha_arqueo: fecha,
      total_general: totalGeneral,
      totales_por_metodo: resumenTotales,
      ventas_sin_identificacion_cliente: ventasNoIdentificadas
    });
  } catch (error) {
    console.error('Error al generar el arqueo:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al generar el arqueo.',
      details: error.message
    });
  }
};

const registrarCierreGlobal = async (req, res) => {
  const {
    fecha_cierre,
    total_efectivo,
    total_tarjeta,
    total_transferencia,
    ventas_ids_incluidas
  } = req.body;

  if (!fecha_cierre || !ventas_ids_incluidas || ventas_ids_incluidas.length === 0) {
    return res.status(400).json({ message: 'Datos incompletos o no hay ventas para registrar el cierre global.' });
  }

  const t = await sequelize.transaction();
  try {
    const totalCierre = total_efectivo + total_tarjeta + total_transferencia;
    const cierreGlobal = await CierreGlobal.create(
      {
        fecha_cierre,
        total_efectivo,
        total_tarjeta,
        total_transferencia,
        total_cierre: totalCierre,
        fecha_creacion: new Date()
      },
      { transaction: t }
    );

    if (ventas_ids_incluidas.length > 0) {
      const detalleValues = ventas_ids_incluidas.map((ventaId) => ({
        cierre_global_id: cierreGlobal.id,
        venta_id: ventaId
      }));
      await CierreGlobalDetalle.bulkCreate(detalleValues, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({
      message: 'Cierre global registrado exitosamente.',
      cierreGlobalId: cierreGlobal.id
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al registrar el cierre global:', error);
    return res.status(500).json({
      message: 'Error interno al registrar el cierre global.',
      error: error.message
    });
  }
};

module.exports = {
  crearVenta,
  listarVentas,
  obtenerVentaPorId,
  resumenVentas,
  generarFacturaPDF,
  anularVenta,
  generarArqueo,
  registrarCierreGlobal,
  listarCierresGlobales: async (req, res) => {
    const { desde, hasta, includeDetails } = req.query;
    const where = {};
    if (desde || hasta) {
      if (desde && hasta) where.fecha_cierre = { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] };
      else if (desde) where.fecha_cierre = { [Op.gte]: `${desde} 00:00:00` };
      else if (hasta) where.fecha_cierre = { [Op.lte]: `${hasta} 23:59:59` };
    }
    const includeOptions = [];
    if (includeDetails === 'true') {
      includeOptions.push({
        model: CierreGlobalDetalle,
        as: 'detallesDeCierreGlobal',
        include: [{ model: Venta, as: 'ventaAsociadaACierre', attributes: ['id', 'fecha', 'total', 'numero_factura'] }]
      });
    }
    try {
      const cierres = await CierreGlobal.findAll({
        where,
        order: [['fecha_cierre', 'DESC']],
        include: includeOptions
      });
      return res.json(cierres);
    } catch (error) {
      console.error('Error al obtener cierres globales:', error);
      return res.status(500).json({ error: 'Error interno al obtener cierres globales.', details: error.message });
    }
  }
};