const { sequelize } = require('../config/database');
const InventarioMovimiento = require('../models/InventarioMovimiento');
const Producto = require('../models/Producto');

const seedMovimientosInventario = async () => {
  try {
    await sequelize.sync({ alter: true }); // Asegura que estén actualizados los modelos

    const productoPizza = await Producto.findOne({ where: { nombre: 'Pizza Muzzarella' } });
    const productoBebida = await Producto.findOne({ where: { nombre: 'Refresco 500ml' } });

    if (!productoPizza || !productoBebida) {
      console.error('❌ No se encontraron productos requeridos. Ejecutá primero el seed de productos.');
      process.exit(1);
    }

    const movimientos = [
      {
        producto_id: productoPizza.id,
        tipo: 'entrada',
        motivo: 'compra',
        cantidad: 20,
        descripcion: 'Compra a proveedor',
        usuario_id: 1
      },
      {
        producto_id: productoPizza.id,
        tipo: 'salida',
        motivo: 'venta',
        cantidad: 5,
        descripcion: 'Venta directa en mostrador',
        usuario_id: 2
      },
      {
        producto_id: productoBebida.id,
        tipo: 'salida',
        motivo: 'merma',
        cantidad: 2,
        descripcion: 'Botellas rotas',
        usuario_id: 1
      },
      {
        producto_id: productoBebida.id,
        tipo: 'ajuste',
        motivo: 'ajuste manual',
        cantidad: 10,
        descripcion: 'Ajuste de stock tras inventario físico',
        usuario_id: 1
      }
    ];

    for (const mov of movimientos) {
      const { registrarMovimientoInventario } = require('../services/inventarioService');
      await registrarMovimientoInventario(mov);
    }

    console.log('✔ Movimientos de inventario generados correctamente');
    process.exit();
  } catch (error) {
    console.error('❌ Error al insertar movimientos de inventario:', error);
    process.exit(1);
  }
};

seedMovimientosInventario();
