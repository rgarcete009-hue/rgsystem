'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ⚠️ Ajusta producto_id a UUID si tus productos usan UUID
const PedidoDetalle = sequelize.define('PedidoDetalle', {
  id:             { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  pedido_id:      { type: DataTypes.UUID, allowNull: false },
  producto_id:    { type: DataTypes.INTEGER, allowNull: false }, // <- INTEGER para alinear con tu VentaDetalle
  nombre:         { type: DataTypes.TEXT, allowNull: false },
  cantidad:       { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario:{ type: DataTypes.INTEGER, allowNull: false },
  subtotal:       { type: DataTypes.INTEGER, allowNull: false },
  notas:          { type: DataTypes.TEXT, allowNull: true },
  parent_id:      { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'pedido_detalles',
  timestamps: true,
  underscored: true,
});

module.exports = PedidoDetalle;
