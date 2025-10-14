const Compra = require('../models/Compra');
const CompraDetalle = require('../models/CompraDetalle');
const { registrarMovimiento } = require('../controllers/inventarioController');
require('../models/Producto');
require('../models/CompraDetalle');
require('../models/Compra');
const { sequelize } = require('../config/database');

const seedCompra = async () => {
  try {
    await sequelize.sync();

    const compra = await Compra.create({
      proveedor: 'Proveedor Ejemplo',
      total: 150000
    });

    const detalles = [
      { producto_id: 1, cantidad: 5, precio_unitario: 10000 },
      { producto_id: 2, cantidad: 10, precio_unitario: 5000 }
    ];

    for (const item of detalles) {
      await CompraDetalle.create({
        compra_id: compra.id,
        ...item
      });

      await registrarMovimiento({
        producto_id: item.producto_id,
        tipo: 'ENTRADA',
        cantidad: item.cantidad,
        descripcion: `Compra (Seeder) ID ${compra.id}`
      });
    }

    console.log('Compra sembrada correctamente');
    process.exit();
  } catch (error) {
    console.error('Error en el seeder de compras:', error);
  }
};

seedCompra();
