// src/utils/inventario.js

const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto'); // Asumo que necesitas Producto para las alertas de stock mínimo

/**
 * Calcula el stock actual de un producto.
 * Ahora acepta un objeto 'options' para pasar una transacción.
 */
const calcularStockActual = async (producto_id, options = {}) => { // <-- Añadido options
  // Pasa la transacción a las operaciones de suma
  const entradas = await MovimientoInventario.sum('cantidad', {
    where: { producto_id, tipo: 'ENTRADA' },
    transaction: options.transaction // <-- ¡Pásalo aquí!
  }) || 0;

  const salidas = await MovimientoInventario.sum('cantidad', {
    where: { producto_id, tipo: 'SALIDA' },
    transaction: options.transaction // <-- ¡Pásalo aquí!
  }) || 0;

  return entradas - salidas;
};

/**
 * Registra un movimiento y verifica alertas de stock.
 * Ahora acepta un objeto 'options' para pasar una transacción.
 */
const registrarMovimiento = async ({
  producto_id,
  tipo,
  cantidad,
  descripcion = '',
  referencia_id = null,
  referencia_tipo = null
}, options = {}) => { // <-- Añadido options
  if (!producto_id || !tipo || !cantidad) {
    throw new Error('Faltan datos obligatorios para registrar el movimiento');
  }

  // Crear el movimiento - ¡Pasa la transacción aquí!
  const movimiento = await MovimientoInventario.create({
    producto_id,
    tipo,
    cantidad,
    descripcion,
    referencia_id,
    referencia_tipo,
    fecha: new Date() // Es buena práctica establecer la fecha aquí si no se hace por defecto en el modelo
  }, { transaction: options.transaction }); // <-- ¡Pásalo aquí!

  // Cargar el producto y verificar stock mínimo - ¡Pasa la transacción aquí!
  const producto = await Producto.findByPk(producto_id, { transaction: options.transaction });

  if (producto) {
    // Al calcular el stock actual, también pasa la transacción
    const stockActual = await calcularStockActual(producto_id, { transaction: options.transaction });

    if (stockActual < producto.stock_minimo) {
      console.warn(`⚠️ Alerta: el stock de "${producto.nombre}" está por debajo del mínimo (${stockActual} < ${producto.stock_minimo})`);
      // Aquí puedes emitir un evento, guardar la alerta, enviar notificación, etc.
      // Si la alerta implica una operación de DB, ¡también debería usar la transacción!
    }
  }

  return movimiento;
};

module.exports = {
  registrarMovimiento,
  calcularStockActual,
};