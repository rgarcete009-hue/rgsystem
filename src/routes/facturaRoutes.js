// src/routes/facturaRoutes.js
const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

// ⚠️ IMPORTANTE: rutas más específicas primero
router.get('/:venta_id/datos', facturaController.generarFacturaDatos);

// Ruta existente: HTML imprimible (fallback)
router.get('/:venta_id', facturaController.generarFactura);

module.exports = router;
