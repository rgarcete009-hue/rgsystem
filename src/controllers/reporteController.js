// src/controllers/reporteController.js (Crear si no existe, o añadir a uno existente)
const { Sequelize, Op } = require('sequelize'); // Importar Op y Sequelize
const Venta = require('../models/Venta');
const VentaDetalle = require('../models/VentaDetalle'); // Puede que necesites VentaDetalle si quieres desglosar IVA, pero para total diario no es estrictamente necesario.
const Producto = require('../models/Producto'); // También si necesitas desglosar IVA.

const getVentasTotalesDiariasPorPeriodo = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Obtenemos los parámetros de fecha

        let whereClause = {};

        // Construir la cláusula WHERE para el rango de fechas
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0); // Inicio del día UTC

            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999); // Fin del día UTC

            whereClause.fecha = {
                [Op.between]: [start, end]
            };
        } else if (startDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);
            whereClause.fecha = {
                [Op.gte]: start
            };
        } else if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            whereClause.fecha = {
                [Op.lte]: end
            };
        } else {
            // Si no se proveen fechas, podemos establecer un rango por defecto (ej. últimos 30 días)
            // O devolver un error si las fechas son obligatorias para este reporte
            // Por ahora, si no hay fechas, devolverá un resumen de todas las ventas agrupadas por día (sin filtro de rango)
            // Es buena idea obligar las fechas en el frontend para evitar resultados enormes.
        }

        const ventasDiarias = await Venta.findAll({
            where: whereClause,
            attributes: [
                // Extraer solo la fecha de la columna 'fecha'
                [Sequelize.fn('DATE', Sequelize.col('fecha')), 'fecha_dia'],
                [Sequelize.fn('SUM', Sequelize.col('total')), 'totalVendidoDia'],
                // Puedes añadir más agregaciones aquí si lo necesitas
                // [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN "detallesDeVenta"."producto"."impuesto" = 10 THEN "detallesDeVenta"."subtotal" * 0.10 ELSE 0 END')), 'totalIVA10Dia'],
                // Para los totales de IVA por día, necesitarías incluir los detalles de venta y agrupar por fecha y por tasa de IVA.
                // Es más complejo y podría requerir una consulta separada o un procesamiento post-consulta.
            ],
            group: [Sequelize.fn('DATE', Sequelize.col('fecha'))], // Agrupar por la fecha del día
            order: [[Sequelize.fn('DATE', Sequelize.col('fecha')), 'ASC']] // Ordenar por fecha ascendente
            // Nota: Para agrupar y sumar por IVA por día, necesitarías incluir VentaDetalle y Producto
            // y hacer agrupaciones más complejas o múltiples consultas.
            // Por simplicidad, este ejemplo solo suma el 'total' de la venta.
        });

        return res.status(200).json(ventasDiarias);
    } catch (error) {
        console.error('Error al obtener ventas totales diarias por periodo:', error);
        return res.status(500).json({ message: 'Error interno del servidor al obtener ventas diarias', error: error.message });
    }
};

module.exports = {
    getVentasTotalesDiariasPorPeriodo,
    // ... otros métodos de reporte si los tienes
};