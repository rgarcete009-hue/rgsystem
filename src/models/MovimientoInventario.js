const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MovimientoInventario = sequelize.define('MovimientoInventario', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('ENTRADA', 'SALIDA', 'AJUSTE'),
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referencia_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  referencia_tipo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'movimientos_inventario',
  timestamps: true
});

module.exports = MovimientoInventario;


