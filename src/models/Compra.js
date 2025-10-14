// src/models/Compra.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Compra = sequelize.define('Compra', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  proveedor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'proveedores', // <--- CAMBIO AQUÍ: 'proveedores' en minúsculas
      key: 'id',
    }
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  metodo_pago: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'registrada',
    allowNull: false
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'compras',
  timestamps: true
});

module.exports = Compra;