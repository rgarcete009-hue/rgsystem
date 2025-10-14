const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Asegúrate que la ruta a tu archivo database.js es correcta

const Proveedor = sequelize.define('Proveedor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Un nombre de proveedor debería ser único
  },
  contacto: {
    type: DataTypes.STRING,
    allowNull: true, // Puede ser un teléfono, email, etc.
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING(20), // Asumiendo un formato de 20 caracteres para el teléfono
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, // El email también podría ser único
    validate: {
      isEmail: true, // Validación básica de email
    },
  },
  ruc: { // Registro Único de Contribuyentes (para Paraguay, Argentina, etc.)
    type: DataTypes.STRING(20),
    allowNull: true, // Puede ser null si no todos los proveedores tienen RUC
    unique: true, // El RUC debe ser único
  },
  // Puedes añadir otros campos que consideres relevantes para un proveedor
}, {
  tableName: 'proveedores', // Nombre de la tabla en la base de datos
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  underscored: true, // Usa snake_case para los nombres de columnas (created_at en lugar de createdAt)
});

module.exports = Proveedor;