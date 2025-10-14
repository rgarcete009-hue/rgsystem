// src/controllers/cajaController.js
const { Op, fn, col } = require('sequelize');
const MovimientoCaja = require('../models/MovimientoCaja'); // Asegúrate de que la ruta sea correcta

const getResumenCajaDiario = async (req, res) => {
    const { fecha } = req.query; // Espera una fecha como 'YYYY-MM-DD'

    if (!fecha) {
        return res.status(400).json({ error: 'La fecha es obligatoria para el resumen de caja.' });
    }

    const fechaInicio = `${fecha} 00:00:00`;
    const fechaFin = `${fecha} 23:59:59`;

    try {
        // Calcular el total de ingresos
        const totalIngresos = await MovimientoCaja.sum('monto', {
            where: {
                tipo: 'ingreso',
                fecha: { [Op.between]: [fechaInicio, fechaFin] }
            }
        });

        // Calcular el total de egresos
        const totalEgresos = await MovimientoCaja.sum('monto', {
            where: {
                tipo: 'egreso',
                fecha: { [Op.between]: [fechaInicio, fechaFin] }
            }
        });

        const saldoNeto = (totalIngresos || 0) - (totalEgresos || 0);

        // También podemos obtener los movimientos detallados si el frontend los necesita
        const movimientosDetallados = await MovimientoCaja.findAll({
            where: {
                fecha: { [Op.between]: [fechaInicio, fechaFin] }
            },
            order: [['fecha', 'ASC']]
        });


        res.json({
            fecha: fecha,
            total_ingresos: totalIngresos || 0,
            total_egresos: totalEgresos || 0,
            saldo_neto: saldoNeto,
            movimientos_detallados: movimientosDetallados
        });

    } catch (error) {
        console.error('Error al obtener resumen de caja diario:', error);
        res.status(500).json({ error: 'Error interno al obtener el resumen de caja.', details: error.message });
    }
};

module.exports = {
    getResumenCajaDiario
};