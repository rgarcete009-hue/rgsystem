// src/models/VentaDetalle.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VentaDetalle = sequelize.define('VentaDetalle', {
  venta_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  producto_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.INTEGER, allowNull: false },
  subtotal: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'venta_detalles',
  timestamps: true // poné false si tu tabla no tiene createdAt/updatedAt
});

module.exports = VentaDetalle;
