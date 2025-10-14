// models/CierreGlobal.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Asegúrate de la ruta correcta a tu instancia de sequelize

const CierreGlobal = sequelize.define('CierreGlobal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha_cierre: {
    type: DataTypes.DATEONLY, // Solo la fecha, sin hora
    allowNull: false
  },
  total_efectivo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_tarjeta: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_transferencia: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_cierre: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'cierre_global',
  timestamps: false // No maneja createdAt/updatedAt automáticamente
});

module.exports = CierreGlobal;