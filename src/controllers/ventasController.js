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
 SUM(d.cantidad) AS cantidad, 
 MAX(d.precio_unitario) AS precio_unitario, 
 SUM(d.subtotal) AS subtotal 
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
 costoEnvio = Number(ped.costo_envio ?? 0); 
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
 pedido_id: pedido_id ?? null, 
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
 await Mesa.update({ estado: 'libre', pedido_abierto_id: null }, { where: { id: mesaId }, transaction: t }); 
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
const listarVentas = async (req, res) => { /* rest omitted for brevity in this bundle */ return res.status(501).json({error:'Truncated for patch build'}); };
const obtenerVentaPorId = async (req, res) => { return res.status(501).json({error:'Truncated for patch build'}); };
const generarFacturaPDF = async (req, res) => { return res.status(501).json({error:'Truncated for patch build'}); };
const anularVenta = async (req, res) => { return res.status(501).json({error:'Truncated for patch build'}); };
const generarArqueo = async (req, res) => { return res.status(501).json({error:'Truncated for patch build'}); };
const registrarCierreGlobal = async (req, res) => { return res.status(501).json({error:'Truncated for patch build'}); };
module.exports = { 
 crearVenta,
 listarVentas,
 obtenerVentaPorId,
 generarFacturaPDF,
 anularVenta,
 generarArqueo,
 registrarCierreGlobal
};