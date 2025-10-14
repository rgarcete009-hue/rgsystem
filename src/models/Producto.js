const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Producto = sequelize.define('Producto', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.STRING },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  precio_costo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  stock_minimo: { type: DataTypes.INTEGER, defaultValue: 0 },
  unidad_medida: { type: DataTypes.STRING, defaultValue: 'unidad' },
  categoria: { type: DataTypes.STRING },
  codigo_barra: { type: DataTypes.STRING },
  codigo_producto: { type: DataTypes.STRING },
  impuesto: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.00 }, // IVA por defecto
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  tipo: { type: DataTypes.STRING, defaultValue: 'producto' }, // producto, insumo, servicio
  es_compuesto: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'productos'
});

module.exports = Producto;
