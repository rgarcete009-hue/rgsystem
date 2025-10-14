// src/controllers/configuracionEmpresaController.js

const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa'); // Asegúrate de que esta ruta sea correcta

// Función para obtener la configuración de la empresa
const getConfiguracionEmpresa = async (req, res) => {
    try {
        const config = await ConfiguracionEmpresa.findByPk(1); // Asumiendo ID 1 para la configuración de la empresa
        if (!config) {
            return res.status(404).json({ message: 'Configuración de la empresa no encontrada.' });
        }
        res.json(config);
    } catch (error) {
        console.error('Error al obtener la configuración de la empresa:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Función para crear o actualizar la configuración de la empresa
const upsertConfiguracionEmpresa = async (req, res) => {
    const newData = req.body;
    const configId = 1; // Asumiendo un ID fijo para la configuración de la empresa

    try {
        let config = await ConfiguracionEmpresa.findByPk(configId);
        if (config) {
            // Actualizar la configuración existente
            await config.update(newData);
            return res.json({ message: 'Configuración de la empresa actualizada exitosamente.', config });
        } else {
            // Crear una nueva configuración si no existe
            config = await ConfiguracionEmpresa.create({ id: configId, ...newData });
            return res.status(201).json({ message: 'Configuración de la empresa creada exitosamente.', config });
        }
    } catch (error) {
        console.error('Error al insertar/actualizar la configuración de la empresa:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

module.exports = {
    getConfiguracionEmpresa,
    upsertConfiguracionEmpresa,
};