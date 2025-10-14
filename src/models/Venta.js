// src/models/Venta.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Venta = sequelize.define('Venta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total: { type: DataTypes.INTEGER, allowNull: false },
  metodo_pago: { type: DataTypes.STRING, allowNull: false, defaultValue: 'efectivo' },
  cliente_id: { type: DataTypes.UUID, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  estado: { type: DataTypes.STRING, allowNull: false, defaultValue: 'activa' },
  fecha_anulacion: { type: DataTypes.DATE, allowNull: true },
  numero_factura: { type: DataTypes.STRING, allowNull: true, unique: true },

  // NUEVO:
  pedido_id: { type: DataTypes.UUID, allowNull: true },
  costo_envio: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'ventas',
  timestamps: true,
});

module.exports = Venta;
