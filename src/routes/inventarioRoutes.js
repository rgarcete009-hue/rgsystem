const express = require('express');
const router = express.Router();
const { obtenerStockActual, historialPorProducto, registrarEntradaManual, obtenerMovimientosPorProducto } = require('../controllers/inventarioController');

// Ruta para obtener el stock actual
router.get('/stock', obtenerStockActual);

// Ruta para obtener el historial de movimientos por producto
router.get('/movimientos/:producto_id', historialPorProducto);

// Ruta para obtener registroentradamanual
router.post('/entrada-manual', registrarEntradaManual);

// Ruta para obtener Movimientos
router.get('/productos/:id/movimientos', obtenerMovimientosPorProducto);

module.exports = router;

