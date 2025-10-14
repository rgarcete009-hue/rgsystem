const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Producto = require('./Producto');

const InventarioMovimiento = sequelize.define('InventarioMovimiento', {
  tipo: { // entrada | salida | ajuste
    type: DataTypes.ENUM('entrada', 'salida', 'ajuste'),
    allowNull: false
  },
  motivo: { // compra, venta, pérdida, ajuste manual, etc.
    type: DataTypes.STRING,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true // luego se puede relacionar con un módulo de usuarios
  }
}, {
  tableName: 'inventario_movimientos'
});

// Relación con Producto
InventarioMovimiento.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

module.exports = InventarioMovimiento;
