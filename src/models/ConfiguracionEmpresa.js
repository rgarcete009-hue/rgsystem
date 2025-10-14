// src/models/ConfiguracionEmpresa.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // ¡IMPORTANTE: Importar sequelize aquí!

// Definir el modelo directamente, sin envolverlo en una función de exportación
const ConfiguracionEmpresa = sequelize.define('ConfiguracionEmpresa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // Esto asegura que siempre haya un registro con ID 1 si es el primero en crearse
    },
    nombreEmpresa: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    actividadPrincipal: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    otrasActividades: {
        type: DataTypes.TEXT, // Usamos TEXT para permitir más texto y saltos de línea
        allowNull: true,
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    localidad: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ruc: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // El RUC debería ser único
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timbradoNo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timbradoValidoDesde: {
        type: DataTypes.DATEONLY, // Solo la fecha (ej. 'YYYY-MM-DD')
        allowNull: true,
    },
    timbradoValidoHasta: {
        type: DataTypes.DATEONLY, // Solo la fecha (ej. 'YYYY-MM-DD')
        allowNull: true,
    },
    // --- Campos para el correlativo de factura ---
    prefijoFactura: { // Ej: '017-005-'. Este es el prefijo fijo del número de factura.
        type: DataTypes.STRING,
        defaultValue: '001-001', // Valor por defecto inicial
        allowNull: false
    },
    ultimoCorrelativoFactura: { // El último número secuencial utilizado (ej. si la factura es 001-001-0000005, este será 5)
        type: DataTypes.INTEGER,
        defaultValue: 0, // Inicia en 0 para que la primera factura sea 1
        allowNull: false,
    },
    // --- Fin campos correlativo de factura ---
}, {
    tableName: 'configuracion_empresa', // Nombre de la tabla en la base de datos
    timestamps: true, // Para que Sequelize añada createdAt y updatedAt
});

module.exports = ConfiguracionEmpresa; // ¡EXPORTAMOS EL MODELO DIRECTAMENTE!