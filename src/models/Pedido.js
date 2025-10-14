'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id:                 { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tipo:               { type: DataTypes.ENUM('mostrador','mesa','delivery'), allowNull: false },
  mesa_id:            { type: DataTypes.UUID, allowNull: true },
  cliente_id:         { type: DataTypes.UUID, allowNull: true },
  estado:             { type: DataTypes.ENUM('abierto','en_preparacion','listo','entregado','cobrado','cancelado'), allowNull: false, defaultValue: 'abierto' },
  delivery_telefono:  { type: DataTypes.STRING },
  delivery_direccion: { type: DataTypes.TEXT },
  delivery_referencia:{ type: DataTypes.TEXT },
  repartidor_id:      { type: DataTypes.UUID },
  costo_envio:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  closed_at:          { type: DataTypes.DATE, allowNull: true },
  delivery_nombre: { type: DataTypes.TEXT }, 

}, {
  tableName: 'pedidos',
  timestamps: true,
  underscored: true,
});

module.exports = Pedido;
