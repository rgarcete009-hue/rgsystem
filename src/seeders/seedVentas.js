const { sequelize } = require('../config/database');
const Venta = require('../models/Venta');
const VentaDetalle = require('../models/VentaDetalle');
const Producto = require('../models/Producto');
const { registrarMovimientoInventario } = require('../services/inventarioService');

const seedVentas = async () => {
  try {
    await sequelize.sync({ alter: true });

    const pizza = await Producto.findOne({ where: { nombre: 'Pizza Muzzarella' } });
    const bebida = await Producto.findOne({ where: { nombre: 'Refresco 500ml' } });

    if (!pizza || !bebida) {
      console.error('❌ Productos no encontrados. Asegurate de ejecutar el seed de productos.');
      process.exit(1);
    }

    // Simulamos venta
    const venta = await Venta.create({
      total: pizza.precio_venta * 2 + bebida.precio_venta * 1,
      metodo_pago: 'efectivo',
      cliente_id: null,
      usuario_id: 1,
      estado: 'finalizada'
    });

    // Detalles de la venta
    const detalles = [
      {
        venta_id: venta.id,
        producto_id: pizza.id,
        cantidad: 2,
        precio_unitario: pizza.precio_venta,
        subtotal: pizza.precio_venta * 2
      },
      {
        venta_id: venta.id,
        producto_id: bebida.id,
        cantidad: 1,
        precio_unitario: bebida.precio_venta,
        subtotal: bebida.precio_venta * 1
      }
    ];

    for (const detalle of detalles) {
      await VentaDetalle.create(detalle);

      // Descuento automático del inventario
      await registrarMovimientoInventario({
        producto_id: detalle.producto_id,
        tipo: 'salida',
        motivo: 'venta',
        cantidad: detalle.cantidad,
        descripcion: `Venta ID ${venta.id}`,
        usuario_id: venta.usuario_id
      });
    }

    console.log('✔ Venta creada correctamente con sus movimientos de inventario.');
    process.exit();
  } catch (error) {
    console.error('❌ Error al generar la venta:', error);
    process.exit(1);
  }
};

seedVentas();
