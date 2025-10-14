// src/routes/caja.js
const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');

// Ruta para obtener el resumen de caja diario
router.get('/resumen-diario', cajaController.getResumenCajaDiario);

module.exports = router;