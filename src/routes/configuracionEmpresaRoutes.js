// src/routes/configuracionEmpresaRoutes.js
const express = require('express');
const { getConfiguracionEmpresa, upsertConfiguracionEmpresa } = require('../controllers/configuracionEmpresaController');
const router = express.Router();

router.get('/', getConfiguracionEmpresa);
router.post('/', upsertConfiguracionEmpresa); // También puedes usar PUT si prefieres /api/configuracion/1

module.exports = router;

