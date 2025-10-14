'use strict';
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Pedido, PedidoDetalle, Mesa, Cliente } = require('../models');

/**
 * Abre un pedido. Si es mesa/terraza y ya hay uno abierto para esa mesa, reutiliza ese pedido.
 * Body esperado:
 * {
 *   tipo: 'mesa' | 'terraza' | 'delivery' | 'mostrador',
 *   mesa_id?: UUID,
 *   cliente_id?: UUID,
 *   delivery?: {
 *     telefono?: string,
 *     direccion?: string,
 *     referencia?: string,
 *     nombre?: string,
 *     costo_envio?: number
 *   }
 * }
 */
const abrirPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tipo, mesa_id, cliente_id, delivery } = req.body;

    const isMesaOTerraza = (tipo === 'mesa' || tipo === 'terraza');
    // Sanitización: si llegan como '' o espacios → null (evita 22P02 en UUID)
    const mesaId = (isMesaOTerraza && mesa_id && String(mesa_id).trim() !== '') ? mesa_id : null;
    const clienteId = (cliente_id && String(cliente_id).trim() !== '') ? cliente_id : null;

    // Reusar pedido abierto (evita duplicados por mesa)
    if (isMesaOTerraza && mesaId) {
      const existente = await Pedido.findOne({
        where: { tipo, mesa_id: mesaId, estado: 'abierto' },
        transaction: t,
      });
      if (existente) {
        await Mesa.update(
          { estado: 'ocupada', pedido_abierto_id: existente.id },
          { where: { id: mesaId }, transaction: t }
        );
        await t.commit();
        return res.json({ id: existente.id, reused: true });
      }
    }

    // Crear nuevo pedido
    const p = await Pedido.create(
      {
        tipo,
        mesa_id: isMesaOTerraza ? mesaId : null,
        cliente_id: clienteId,
        // Campos delivery
        delivery_telefono: delivery?.telefono ?? null,
        delivery_direccion: delivery?.direccion ?? null,
        delivery_referencia: delivery?.referencia ?? null,
        delivery_nombre: delivery?.nombre ?? null,
        costo_envio: delivery?.costo_envio ?? 0,
        estado: 'abierto',
      },
      { transaction: t }
    );

    // Marcar mesa ocupada y guardar el pedido abierto
    if (isMesaOTerraza && mesaId) {
      await Mesa.update(
        { estado: 'ocupada', pedido_abierto_id: p.id },
        { where: { id: mesaId }, transaction: t }
      );
    }

    await t.commit();
    return res.json({ id: p.id });
  } catch (e) {
    await t.rollback();
    console.error('abrirPedido error:', e);
    return res.status(400).json({ message: e.message });
  }
};

/**
 * Agrega detalles (ítems) al pedido.
 * Body: { items: [{ producto_id, nombre, cantidad, precio_unitario, subtotal?, notas? }] }
 */
const agregarDetalles = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Sin items' });
    }
    const rows = items.map((i) => {
      const cantidad = Number(i.cantidad ?? 0);
      const precio_unitario = Number(i.precio_unitario ?? 0);
      return {
        pedido_id: id,
        producto_id: Number(i.producto_id),
        nombre: String(i.nombre ?? '').slice(0, 255),
        cantidad: cantidad > 0 ? cantidad : 0,
        precio_unitario: precio_unitario >= 0 ? precio_unitario : 0,
        subtotal: i.subtotal != null ? Number(i.subtotal) : precio_unitario * cantidad,
        notas: i.notas ? String(i.notas) : null,
        parent_id: i.parent_id ?? null,
      };
    });
    for (const r of rows) {
      if (!r.producto_id || r.cantidad <= 0 || r.precio_unitario < 0) {
        return res.status(400).json({
          message:
            'Ítem inválido (producto_id, cantidad > 0 y precio_unitario >= 0 son obligatorios).',
        });
      }
    }
    const created = await PedidoDetalle.bulkCreate(rows, { validate: true });
    return res.json(created);
  } catch (e) {
    console.error('agregarDetalles error:', e);
    return res.status(400).json({ message: e.message });
  }
};

/**
 * Obtiene los detalles (ítems) de un pedido.
 * GET /pedidos/:id/detalles
 */
const obtenerDetalles = async (req, res) => {
  try {
    const detalles = await PedidoDetalle.findAll({
      where: { pedido_id: req.params.id },
      order: [['created_at', 'ASC']],
    });
    return res.json(detalles);
  } catch (e) {
    console.error('obtenerDetalles error:', e);
    return res.status(500).json({ message: e.message });
  }
};

/**
 * Lista pedidos filtrando por tipo y estado
 * GET /pedidos?tipo=delivery&estado=abierto&q=juan&limit=50
 */
const listarPedidos = async (req, res) => {
  try {
    const { tipo, estado, q, limit = 50 } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo; // 'delivery' | 'mesa' | 'terraza' | 'mostrador'
    if (estado) where.estado = estado; // 'abierto' | 'en_preparacion' | 'listo' | 'entregado' | 'cobrado' | 'cancelado'
    if (q && String(q).trim().length > 0) {
      const term = `%${String(q).trim()}%`;
      where[Op.or] = [
        { delivery_nombre: { [Op.iLike]: term } },
        { delivery_telefono: { [Op.iLike]: term } },
        { delivery_direccion: { [Op.iLike]: term } },
        { delivery_referencia: { [Op.iLike]: term } },
      ];
    }
    const pedidos = await Pedido.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(limit) ?? 50, 200),
      attributes: [
        'id',
        'tipo',
        'estado',
        'created_at',
        'costo_envio',
        'delivery_telefono',
        'delivery_direccion',
        'delivery_referencia',
        'delivery_nombre',
        'cliente_id',
        'mesa_id',
      ],
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'ruc'], required: false }],
    });
    return res.json(pedidos);
  } catch (e) {
    console.error('listarPedidos error:', e);
    return res.status(500).json({ message: e.message });
  }
};

/**
 * Actualiza el estado del pedido.
 * PATCH /pedidos/:id/estado body: { estado: 'listo' | 'entregado' | 'cobrado' | 'cancelado' ... }
 */
const actualizarEstadoPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const p = await Pedido.findByPk(id, { transaction: t });
    if (!p) {
      await t.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    await p.update({ estado, updated_at: new Date() }, { transaction: t });

    // Si es mesa o terraza y el estado finaliza el pedido, liberar mesa y limpiar pedido_abierto_id
    if ((p.tipo === 'mesa' || p.tipo === 'terraza') && p.mesa_id && (estado === 'cobrado' || estado === 'cancelado')) {
      await Mesa.update(
        { estado: 'libre', pedido_abierto_id: null },
        { where: { id: p.mesa_id }, transaction: t }
      );
    }

    await t.commit();
    return res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    console.error('actualizarEstadoPedido error:', e);
    return res.status(400).json({ message: e.message });
  }
};

module.exports = {
  abrirPedido,
  agregarDetalles,
  obtenerDetalles,
  listarPedidos,
  actualizarEstadoPedido,
};