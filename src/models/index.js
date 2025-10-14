// src/models/index.js
const { sequelize } = require('../config/database');

// Importar modelos (solo define, sin asociaciones dentro de cada archivo)
const Cliente = require('./Cliente');
const Compra = require('./Compra');
const CompraDetalle = require('./CompraDetalle');
const ConfiguracionEmpresa = require('./ConfiguracionEmpresa');
const MovimientoInventario = require('./MovimientoInventario');
const Producto = require('./Producto');
const Proveedor = require('./Proveedor');
const Venta = require('./Venta');
const VentaDetalle = require('./VentaDetalle');
const CierreGlobal = require('./CierreGlobal');
const CierreGlobalDetalle = require('./CierreGlobalDetalle');
const MovimientoCaja = require('./MovimientoCaja');
const User = require('./User');

// 🔹 NUEVOS MODELOS
const Mesa = require('./Mesa');
const Pedido = require('./Pedido');
const PedidoDetalle = require('./PedidoDetalle');

// =======================
// ASOCIACIONES CENTRALIZADAS
// =======================

// Cliente <-> Venta
Cliente.hasMany(Venta, { foreignKey: 'cliente_id', as: 'ventasDelCliente' });
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// Venta <-> VentaDetalle
Venta.hasMany(VentaDetalle, { foreignKey: 'venta_id', as: 'detallesDeVenta' });
VentaDetalle.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' }); // alias interno para back
// VentaDetalle <-> Producto
// ⚠️ Alias 'producto' para que coincida con controladores (factura/ventas)
VentaDetalle.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(VentaDetalle, { foreignKey: 'producto_id', as: 'detallesDeVentas' });

// Producto <-> MovimientoInventario
Producto.hasMany(MovimientoInventario, { foreignKey: 'producto_id', as: 'movimientosDeInventario' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'productoMovido' });

// Proveedor <-> Compra
Proveedor.hasMany(Compra, { foreignKey: 'proveedor_id', as: 'comprasRealizadas' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

// Compra <-> CompraDetalle
Compra.hasMany(CompraDetalle, { foreignKey: 'compra_id', as: 'detallesDeCompra' });
CompraDetalle.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compraAsociada' });

// CompraDetalle <-> Producto
Producto.hasMany(CompraDetalle, { foreignKey: 'producto_id', as: 'detallesCompraProducto' });
CompraDetalle.belongsTo(Producto, { foreignKey: 'producto_id', as: 'productoComprado' });

// CierreGlobal <-> CierreGlobalDetalle
CierreGlobal.hasMany(CierreGlobalDetalle, { foreignKey: 'cierre_global_id', as: 'detallesDeCierreGlobal' });
CierreGlobalDetalle.belongsTo(CierreGlobal, { foreignKey: 'cierre_global_id', as: 'cierreGlobalAsociado' });

// CierreGlobalDetalle <-> Venta
CierreGlobalDetalle.belongsTo(Venta, { foreignKey: 'venta_id', as: 'ventaAsociadaACierre' });
Venta.hasOne(CierreGlobalDetalle, { foreignKey: 'venta_id', as: 'detalleCierreGlobal' });

// MovimientoCaja <-> Venta
MovimientoCaja.belongsTo(Venta, { foreignKey: 'venta_id', as: 'ventaAsociada' });
Venta.hasMany(MovimientoCaja, { foreignKey: 'venta_id', as: 'movimientosDeCaja' });

// (Opcional) User <-> Venta
// User.hasMany(Venta, { foreignKey: 'usuario_id', as: 'ventas' });
// Venta.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

// (Opcional) User <-> MovimientoCaja
// User.hasMany(MovimientoCaja, { foreignKey: 'usuario_id', as: 'movimientosCaja' });
// MovimientoCaja.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

// =======================
// 🔹 NUEVAS ASOCIACIONES (Mesas / Pedidos)
// =======================

// Mesa <-> Pedido
Mesa.hasMany(Pedido, { foreignKey: 'mesa_id' });
Pedido.belongsTo(Mesa, { foreignKey: 'mesa_id' });

// Pedido <-> PedidoDetalle
Pedido.hasMany(PedidoDetalle, { foreignKey: 'pedido_id', as: 'detalles' });
PedidoDetalle.belongsTo(Pedido, { foreignKey: 'pedido_id' });


// Producto <-> PedidoDetalle (útil para reportes o vistas)
Producto.hasMany(PedidoDetalle, { foreignKey: 'producto_id', as: 'detallesPedidoProducto' });
PedidoDetalle.belongsTo(Producto, { foreignKey: 'producto_id', as: 'productoPedido' });


// 🔹 NUEVO: Pedido ↔ Cliente (para poder incluir Cliente en listarPedidos)
Pedido.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(Pedido, { foreignKey: 'cliente_id', as: 'pedidos' });

// Venta <-> Pedido (una venta puede referenciar un pedido cobrado)
Venta.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });

// Exportar todos los modelos + sequelize
module.exports = {
  sequelize,
  Cliente,
  Compra,
  CompraDetalle,
  ConfiguracionEmpresa,
  MovimientoInventario,
  Producto,
  Proveedor,
  Venta,
  VentaDetalle,
  CierreGlobal,
  CierreGlobalDetalle,
  MovimientoCaja,
  User,

  // 🔹 NUEVOS
  Mesa,
  Pedido,
  PedidoDetalle,
};
