// src/routes/reportes.js (Crear si no existe, o añadir a uno existente)
const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');

// Nueva ruta para ventas totales diarias por periodo
router.get('/ventas-totales-diarias', reporteController.getVentasTotalesDiariasPorPeriodo);

// Si ya tenías esta ruta, solo asegúrate de que use el nuevo controller
// router.get('/ventas-diarias', reporteController.getVentasDiarias); // Tu ruta actual de dashboard

module.exports = router;