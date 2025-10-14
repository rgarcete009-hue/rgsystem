// src/models/MovimientoCaja.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Venta = require('./Venta'); // <-- Asegúrate de importar Venta aquí

const MovimientoCaja = sequelize.define('MovimientoCaja', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo: {
    type: DataTypes.ENUM('ingreso', 'egreso'),
    allowNull: false
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  venta_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser null si el movimiento no está ligado a una venta (ej. egreso por compra de insumos)
    references: {
      model: Venta, // <-- ¡CAMBIA ESTO PARA REFERENCIAR EL OBJETO MODELO!
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL' // O 'RESTRICT', dependiendo de tu lógica de negocio
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
    // references: {
    //   model: 'Usuarios', // Si tienes un modelo de Usuario
    //   key: 'id'
    // }
  }
}, {
  tableName: 'movimientos_caja', // <-- Importante: Define el nombre real de tu tabla aquí
  timestamps: true // Si quieres createdAt y updatedAt automáticos, ponlo en true. Si no, false.
});

module.exports = MovimientoCaja;