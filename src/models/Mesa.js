// src/models/Mesa.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Mesa = sequelize.define('Mesa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'libre',
    validate: {
      isIn: [['libre', 'ocupada', 'reservada']]
    }
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'normal',
    validate: {
      isIn: [['normal', 'terraza']]
    }
  },
  pedido_abierto_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'mesas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Mesa;