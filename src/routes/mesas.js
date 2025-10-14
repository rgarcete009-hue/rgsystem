// src/routes/mesas.js
const express = require('express');
const router = express.Router();
const { listarMesas } = require('../controllers/mesasController');

router.get('/', listarMesas);

module.exports = router;
