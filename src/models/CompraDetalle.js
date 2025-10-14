const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompraDetalle = sequelize.define('CompraDetalle', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  compra_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'compra_detalles',
  timestamps: true
});

module.exports = CompraDetalle;
