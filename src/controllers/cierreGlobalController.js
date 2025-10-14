// Importamos los modelos y servicios necesarios
const CierreGlobal = require('../models/CierreGlobal');
const CierreGlobalDetalle = require('../models/CierreGlobalDetalle');
const Venta = require('../models/Venta'); // Necesitamos Venta para incluirla en los detalles
const Cliente = require('../models/Cliente'); // Necesitamos Cliente para generar el arqueo
const { Op, sequelize } = require('sequelize'); // Incluimos sequelize si lo usas en el literal para Op.notIn

/**
 * Función para generar el reporte de arqueo (ventas a consumidor final no cerradas).
 * Este es el mismo código que teníamos en ventaController.js.
 */
const generarArqueo = async (req, res) => {
    const { fecha } = req.query; // Esperamos una fecha YYYY-MM-DD
    if (!fecha) {
        return res.status(400).json({ message: 'La fecha es obligatoria para generar el arqueo.' });
    }

    try {
        // Obtener el ID del cliente 'Consumidor Final' o 'Venta Rápida'
        const consumidorFinalCliente = await Cliente.findOne({
            where: {
                [Op.or]: [
                    { ruc: '0' },
                    { ruc: 'X' },
                    { nombre: 'Consumidor Final' }
                ]
            }
        });

        if (!consumidorFinalCliente) {
            return res.status(404).json({ message: 'Cliente "Consumidor Final" no configurado en la base de datos.' });
        }

        const ventasNoIdentificadas = await Venta.findAll({
            where: {
                cliente_id: consumidorFinalCliente.id,
                estado: 'activa',
                fecha: {
                    [Op.between]: [`${fecha} 00:00:00`, `${fecha} 23:59:59`]
                },
                id: {
                    [Op.notIn]: sequelize.literal(`(SELECT venta_id FROM cierre_global_detalles WHERE cierre_global_id IS NOT NULL)`)
                }
            },
            attributes: ['id', 'fecha', 'metodo_pago', 'total'],
            order: [['fecha', 'ASC']]
        });

        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalTransferencia = 0;
        let totalGeneral = 0;
        const ventasIncluidas = [];

        ventasNoIdentificadas.forEach(venta => {
            if (venta.metodo_pago === 'efectivo') {
                totalEfectivo += parseFloat(venta.total);
            } else if (venta.metodo_pago === 'tarjeta') {
                totalTarjeta += parseFloat(venta.total);
            } else if (venta.metodo_pago === 'transferencia') {
                totalTransferencia += parseFloat(venta.total);
            }
            totalGeneral += parseFloat(venta.total);
            ventasIncluidas.push({
                id: venta.id,
                fecha: venta.fecha,
                total: venta.total,
                metodo_pago: venta.metodo_pago
            });
        });

        res.json({
            fecha_arqueo: fecha,
            total_general: totalGeneral,
            totales_por_metodo: {
                efectivo: totalEfectivo,
                tarjeta: totalTarjeta,
                transferencia: totalTransferencia,
            },
            ventas_sin_identificacion_cliente: ventasIncluidas
        });

    } catch (error) {
        console.error('Error al generar el arqueo:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar el arqueo.', details: error.message });
    }
};

/**
 * Función para registrar el cierre global de ventas a consumidor final.
 * Este es el mismo código que teníamos en ventaController.js.
 */
const registrarCierreGlobal = async (req, res) => {
    const { fecha_cierre, total_efectivo, total_tarjeta, total_transferencia, ventas_ids_incluidas } = req.body;

    if (!fecha_cierre || !ventas_ids_incluidas || ventas_ids_incluidas.length === 0) {
        return res.status(400).json({ message: 'Datos incompletos o no hay ventas para registrar el cierre global.' });
    }

    const t = await sequelize.transaction(); // Iniciar una transacción de Sequelize

    try {
        // 1. Crear el registro del cierre global
        const totalCierre = total_efectivo + total_tarjeta + total_transferencia;
        const cierreGlobal = await CierreGlobal.create({
            fecha_cierre,
            total_efectivo,
            total_tarjeta,
            total_transferencia,
            total_cierre: totalCierre,
            fecha_creacion: new Date()
        }, { transaction: t });

        // 2. Registrar los detalles de las ventas incluidas en este cierre
        if (ventas_ids_incluidas.length > 0) {
            const detalleValues = ventas_ids_incluidas.map(ventaId => ({
                cierre_global_id: cierreGlobal.id,
                venta_id: ventaId
            }));
            await CierreGlobalDetalle.bulkCreate(detalleValues, { transaction: t });
        }

        await t.commit(); // Confirmar la transacción
        res.status(201).json({ message: 'Cierre global registrado exitosamente.', cierreGlobalId: cierreGlobal.id });

    } catch (error) {
        await t.rollback(); // Revertir la transacción
        console.error('Error al registrar el cierre global:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el cierre global.', error: error.message });
    }
};

/**
 * Función para listar los cierres globales registrados.
 * Permite filtrar por rango de fechas y opcionalmente incluir detalles de las ventas.
 */
const listarCierresGlobales = async (req, res) => {
    const { desde, hasta, includeDetails } = req.query;
    const where = {};

    if (desde || hasta) {
        if (desde && hasta) {
            where.fecha_cierre = { 
                [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`]
            };
        } else if (desde) {
            where.fecha_cierre = { [Op.gte]: `${desde} 00:00:00` };
        } else if (hasta) {
            where.fecha_cierre = { [Op.lte]: `${hasta} 23:59:59` };
        }
    }

    const includeOptions = [];
    if (includeDetails === 'true') {
        includeOptions.push({
            model: CierreGlobalDetalle,
            as: 'detallesCierre', // Asegúrate de que este alias coincide con tu asociación en el modelo CierreGlobal
            include: [{ model: Venta, as: 'venta' }] // Incluir la venta asociada al detalle del cierre
        });
    }

    try {
        const cierres = await CierreGlobal.findAll({
            where,
            order: [['fecha_cierre', 'DESC']],
            include: includeOptions
        });

        return res.json(cierres);
    } catch (error) {
        console.error('Error al obtener cierres globales:', error);
        return res.status(500).json({ error: 'Error interno al obtener cierres globales.', details: error.message });
    }
};

// Exportamos las funciones
module.exports = {
    generarArqueo,
    registrarCierreGlobal,
    listarCierresGlobales
};