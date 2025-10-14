// src/services/inventarioService.js

const InventarioMovimiento = require('../models/InventarioMovimiento'); // Asegúrate de que este modelo exista y esté correctamente definido

/**
 * Registra un movimiento de inventario en la base de datos.
 * Esta función NO actualiza el stock del producto directamente en la tabla 'productos'.
 * La actualización del stock debe ser manejada por el controlador que invoca este servicio.
 *
 * @param {object} data - Objeto con los datos del movimiento.
 * @param {number} data.producto_id - ID del producto afectado.
 * @param {'entrada' | 'salida'} data.tipo - Tipo de movimiento ('entrada' o 'salida').
 * @param {string} data.motivo - Motivo del movimiento (ej. 'compra', 'venta', 'ajuste', 'devolucion').
 * @param {number} data.cantidad - Cantidad del producto involucrado en el movimiento.
 * @param {string} [data.descripcion=''] - Descripción adicional del movimiento.
 * @param {number} [data.usuario_id=null] - ID del usuario que registra el movimiento (opcional).
 * @param {object} [options={}] - Opciones adicionales para Sequelize, como una transacción.
 * @param {object} [options.transaction] - Objeto de transacción de Sequelize.
 * @returns {Promise<{success: boolean, message: string}>} Objeto indicando el éxito y un mensaje.
 * @throws {Error} Si hay un problema al registrar el movimiento.
 */
const registrarMovimientoInventario = async ({
    producto_id,
    tipo,
    motivo,
    cantidad,
    descripcion = '',
    usuario_id = null
}, options = {}) => {
    try {
        // console.log(`Intentando registrar movimiento: Producto ID ${producto_id}, Tipo: ${tipo}, Cantidad: ${cantidad}`);

        // Crear el registro del movimiento en la tabla de movimientos de inventario
        await InventarioMovimiento.create({
            producto_id,
            tipo,
            motivo,
            cantidad: parseInt(cantidad), // Asegurarse de que la cantidad es un entero
            descripcion,
            fecha: new Date(), // Usar la fecha actual del sistema
            usuario_id
        }, { transaction: options.transaction }); // Pasar la transacción si se proporciona

        // console.log(`Movimiento de inventario registrado con éxito para Producto ID: ${producto_id}`);
        return { success: true, message: 'Movimiento de inventario registrado exitosamente.' };

    } catch (error) {
        console.error(`Error en registrarMovimientoInventario para producto ID ${producto_id}:`, error);
        // Lanzar el error para que la transacción de nivel superior pueda capturarlo y hacer rollback
        throw new Error(`Error al registrar movimiento de inventario: ${error.message}`);
    }
};

module.exports = { registrarMovimientoInventario };