// Importamos los modelos y el servicio necesarios
const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');
const { Op } = require('sequelize');
const { registrarMovimiento } = require('../utils/inventario'); // Se agrega el servicio de inventario

/**
 * Función para obtener el stock actual de todos los productos.
 */
const obtenerStockActual = async (req, res) => {
  try {
    const productos = await Producto.findAll();

    const resultado = [];

    for (const producto of productos) {
      const entradas = await MovimientoInventario.sum('cantidad', {
        where: {
          producto_id: producto.id,
          tipo: 'ENTRADA'
        }
      }) || 0;

      const salidas = await MovimientoInventario.sum('cantidad', {
        where: {
          producto_id: producto.id,
          tipo: 'SALIDA'
        }
      }) || 0;

      const stock = entradas - salidas;

      resultado.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        stock
      });
    }

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el stock actual' });
  }
};

/**
 * Función para obtener el historial de movimientos de un producto.
 */
const historialPorProducto = async (req, res) => {
  try {
    const { producto_id } = req.params;

    const movimientos = await MovimientoInventario.findAll({
      where: { producto_id },
      order: [['createdAt', 'DESC']]
    });

    res.json(movimientos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial de movimientos' });
  }
};

/**
 * Función para registrar una entrada manual en el inventario.
 */
const registrarEntradaManual = async (req, res) => {
  try {
    const { producto_id, cantidad, descripcion } = req.body;

    if (!producto_id || !cantidad) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const movimiento = await registrarMovimiento({
      producto_id,
      tipo: 'ENTRADA',
      cantidad,
      descripcion: descripcion || 'Ajuste manual',
    });

    res.status(201).json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar entrada manual' });
  }
};

/**
 * Función para obtener los movimientos de inventario por producto.
 */
const obtenerMovimientosPorProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const movimientos = await MovimientoInventario.findAll({
      where: { producto_id: id },
      order: [['createdAt', 'DESC']]
    });

    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

// Exportamos las funciones para usarlas en las rutas
module.exports = {
  obtenerStockActual,
  historialPorProducto,
  registrarEntradaManual,
  registrarMovimiento,
  obtenerMovimientosPorProducto,
};


