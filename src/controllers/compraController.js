const Compra = require('../models/Compra');
const CompraDetalle = require('../models/CompraDetalle');
const Producto = require('../models/Producto');
const Proveedor = require('../models/Proveedor');
const { sequelize } = require('../config/database'); // Para transacciones
const { Op } = require('sequelize'); // Para operaciones de Sequelize

// Importar servicio para registrar movimiento de inventario (asume que ya tienes esta función)
const { registrarMovimientoInventario } = require('../services/inventarioService');
const { registrarMovimiento } = require('../utils/inventario'); // Asume que tienes este util

/**
 * Crea una nueva compra, sus detalles, actualiza el stock de productos
 * y registra los movimientos de inventario.
 */
exports.crearCompra = async (req, res) => {
    // --- CONSOLE.LOGS DE DEPURACIÓN INICIO ---
    console.log('\n--- INICIANDO PROCESO DE CREACIÓN DE COMPRA ---');
    console.log('Timestamp de inicio:', new Date().toISOString());
    console.log('Datos recibidos en req.body:', JSON.stringify(req.body, null, 2));
    // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

    const { proveedor_id, detalles, metodo_pago = 'efectivo', usuario_id = null } = req.body;

    // Iniciar una transacción para asegurar la atomicidad de la operación
    const t = await sequelize.transaction();

    try {
        // Validación básica
        if (!proveedor_id || !detalles || detalles.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Se requiere un proveedor y al menos un detalle de compra.' });
        }

        // Verificar si el proveedor existe
        const proveedorExistente = await Proveedor.findByPk(proveedor_id, { transaction: t });
        if (!proveedorExistente) {
            await t.rollback();
            return res.status(404).json({ message: 'Proveedor no encontrado.' });
        }

        // Calcular el total de la compra
        const total = detalles.reduce((acc, item) => acc + parseFloat(item.precio_unitario) * parseInt(item.cantidad), 0); // Usar parseFloat y parseInt para seguridad

        // Crear la compra
        const compra = await Compra.create({
            proveedor_id,
            total,
            metodo_pago,
            usuario_id, // Puedes asociar la compra a un usuario que la registró
            estado: 'registrada' // O 'activa', según tu lógica de negocio
        }, { transaction: t });

        // --- CONSOLE.LOGS DE DEPURACIÓN ---
        console.log(`Compra principal creada con ID: ${compra.id}`);
        // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

        // Procesar cada detalle de compra
        await Promise.all(detalles.map(async (item, index) => {
            // --- CONSOLE.LOGS DE DEPURACIÓN ---
            console.log(`\nProcesando detalle #${index + 1} para Producto ID: ${item.producto_id}`);
            console.log(`Detalle recibido: Cantidad ${item.cantidad}, Precio Unitario ${item.precio_unitario}`);
            // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

            // Verificar si el producto existe
            const producto = await Producto.findByPk(item.producto_id, { transaction: t });
            if (!producto) {
                await t.rollback();
                throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
            }

            // Crear el detalle de compra
            await CompraDetalle.create({
                compra_id: compra.id,
                producto_id: item.producto_id,
                cantidad: parseInt(item.cantidad), // Asegurar que es entero
                precio_unitario: parseFloat(item.precio_unitario), // Asegurar que es flotante
                subtotal: parseFloat(item.precio_unitario) * parseInt(item.cantidad)
            }, { transaction: t });

            // --- CONSOLE.LOGS DE DEPURACIÓN ---
            const oldStock = parseInt(producto.stock);
            const cantidadComprada = parseInt(item.cantidad);
            // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

            // Actualizar el stock del producto (sumar)
            producto.stock = oldStock + cantidadComprada;
            await producto.save({ transaction: t });

            // --- CONSOLE.LOGS DE DEPURACIÓN ---
            console.log(`Stock actualizado para Producto ID ${item.producto_id}: De ${oldStock} a ${producto.stock}. Cantidad añadida: ${cantidadComprada}`);
            // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

            // Registrar el movimiento de inventario (entrada por compra)
            // Asegúrate de que estas funciones existan y sean correctas
            if (registrarMovimientoInventario) {
                await registrarMovimientoInventario({
                    producto_id: item.producto_id,
                    tipo: 'entrada',
                    motivo: 'compra',
                    cantidad: cantidadComprada, // Usar la cantidad ya parseada
                    descripcion: `Compra ID ${compra.id}`,
                    usuario_id // El usuario que registró la compra
                }, { transaction: t });
            }

            if (registrarMovimiento) {
                await registrarMovimiento({
                    producto_id: item.producto_id,
                    tipo: 'ENTRADA',
                    cantidad: cantidadComprada, // Usar la cantidad ya parseada
                    descripcion: `Compra ID ${compra.id}`,
                    referencia_id: compra.id,
                    referencia_tipo: 'COMPRA'
                }, { transaction: t });
            }
        }));

        await t.commit(); // Confirmar la transacción

        // --- CONSOLE.LOGS DE DEPURACIÓN ---
        console.log('--- COMPRA REGISTRADA EXITOSAMENTE Y TRANSACCIÓN CONFIRMADA ---');
        console.log('Timestamp de finalización:', new Date().toISOString());
        // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---

        res.status(201).json({ message: 'Compra registrada exitosamente.', compraId: compra.id });

    } catch (error) {
        await t.rollback(); // Revertir la transacción en caso de error
        // --- CONSOLE.LOGS DE DEPURACIÓN ---
        console.error('\n--- ERROR CATASTRÓFICO AL CREAR COMPRA ---');
        console.error('Timestamp del error:', new Date().toISOString());
        // --- CONSOLE.LOGS DE DEPURACIÓN FIN ---
        console.error('Error al crear compra:', error); // Este log contiene el stack trace completo
        res.status(500).json({ message: 'Error interno del servidor al crear la compra.', error: error.message });
    }
};

/**
 * Obtiene una lista de compras con filtros opcionales.
 */
exports.listarCompras = async (req, res) => {
    const { desde, hasta, proveedor_id, estado, includeDetails, includeProveedor } = req.query;
    const where = {};

    if (desde || hasta) {
        if (desde && hasta) {
            where.fecha = { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] };
        } else if (desde) {
            where.fecha = { [Op.gte]: `${desde} 00:00:00` };
        } else if (hasta) {
            where.fecha = { [Op.lte]: `${hasta} 23:59:59` };
        }
    }
    if (proveedor_id) where.proveedor_id = proveedor_id;
    if (estado) where.estado = estado;

    const includeOptions = [];
    if (includeDetails === 'true') {
        includeOptions.push({
            model: CompraDetalle,
            as: 'detallesDeCompra', // Alias correcto según index.js
            include: [{ model: Producto, as: 'productoComprado' }] // Alias correcto según index.js
        });
    }
    if (includeProveedor === 'true') {
        includeOptions.push({
            model: Proveedor,
            as: 'proveedor' // <<<--- ¡CORRECCIÓN APLICADA AQUÍ!
        });
    }

    try {
        const compras = await Compra.findAll({
            where,
            order: [['fecha', 'DESC']],
            include: includeOptions
        });
        res.status(200).json(compras);
    } catch (error) {
        console.error('Error al listar compras:', error);
        res.status(500).json({ message: 'Error interno del servidor al listar compras.', error: error.message });
    }
};

/**
 * Obtiene una compra por su ID.
 */
exports.obtenerCompraPorId = async (req, res) => {
    try {
        const compra = await Compra.findByPk(req.params.id, {
            include: [
                {
                    model: CompraDetalle,
                    as: 'detallesDeCompra', // Alias correcto según index.js
                    include: [{ model: Producto, as: 'productoComprado' }] // Alias correcto según index.js
                },
                {
                    model: Proveedor,
                    as: 'proveedor' // <<<--- ¡CORRECCIÓN APLICADA AQUÍ!
                }
            ]
        });

        if (!compra) {
            return res.status(404).json({ message: 'Compra no encontrada.' });
        }
        res.status(200).json(compra);
    } catch (error) {
        console.error('Error al obtener compra por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener compra.', error: error.message });
    }
};

/**
 * Actualiza una compra existente.
 * NOTA: La lógica de actualización de stock para una compra ya registrada
 * es compleja y debe manejarse con cuidado (ej. si cambian cantidades o productos).
 * Para una implementación simple, podrías solo permitir cambiar el estado o método de pago.
 * Para cambios de ítems, se recomienda anular la compra y crear una nueva.
 */
exports.actualizarCompra = async (req, res) => {
    const { id } = req.params;
    const { metodo_pago, estado } = req.body; // Campos que quizás quieras permitir actualizar

    try {
        const [updated] = await Compra.update({ metodo_pago, estado }, {
            where: { id },
            returning: true // Para obtener la instancia actualizada
        });

        if (updated) {
            const updatedCompra = await Compra.findByPk(id);
            res.status(200).json(updatedCompra);
        } else {
            res.status(404).json({ message: 'Compra no encontrada o no hay cambios para actualizar.' });
        }
    } catch (error) {
        console.error('Error al actualizar compra:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar compra.', error: error.message });
    }
};

/**
 * Elimina una compra.
 * ADVERTENCIA: Eliminar una compra sin revertir los movimientos de inventario
 * dejará el stock en un estado inconsistente. Se recomienda anular la compra
 * y manejar la reversión del stock. Esta función solo elimina el registro.
 */
exports.eliminarCompra = async (req, res) => {
    const { id } = req.params;

    // Para una eliminación real que revierta stock, necesitarías una transacción
    // y la lógica de revertir los movimientos de inventario asociados.
    // Esto es solo un placeholder para la eliminación directa.

    try {
        const deleted = await Compra.destroy({
            where: { id }
        });
        if (deleted) {
            res.status(204).send(); // No Content
        } else {
            res.status(404).json({ message: 'Compra no encontrada para eliminar.' });
        }
    } catch (error) {
        console.error('Error al eliminar compra:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar compra.', error: error.message });
    }
};