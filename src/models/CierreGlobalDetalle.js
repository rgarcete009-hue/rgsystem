// models/CierreGlobalDetalle.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Venta = require('./Venta'); // Importa el modelo de Venta
const CierreGlobal = require('./CierreGlobal'); // Importa el modelo de CierreGlobal

const CierreGlobalDetalle = sequelize.define('CierreGlobalDetalle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cierre_global_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CierreGlobal,
      key: 'id'
    }
  },
  venta_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Venta,
      key: 'id'
    },
    unique: true // Una venta solo puede estar en un detalle de cierre global
  }
}, {
  tableName: 'cierre_global_detalles',
  timestamps: false
});

// Definir las asociaciones
CierreGlobal.hasMany(CierreGlobalDetalle, { foreignKey: 'cierre_global_id', as: 'detalles' });
CierreGlobalDetalle.belongsTo(CierreGlobal, { foreignKey: 'cierre_global_id', as: 'cierreGlobal' });
CierreGlobalDetalle.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

module.exports = CierreGlobalDetalle;