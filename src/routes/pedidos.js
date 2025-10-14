// src/routes/pedidos.js
const express = require('express');
const router = express.Router();
const {
  abrirPedido,
  agregarDetalles,
  obtenerDetalles,
  listarPedidos,          // ⬅️ nuevo
  actualizarEstadoPedido  // ⬅️ nuevo
} = require('../controllers/pedidosController');

router.get('/', listarPedidos);                // ⬅️ /api/pedidos?tipo=delivery&estado=abierto
router.post('/', abrirPedido);
router.post('/:id/detalles', agregarDetalles);
router.get('/:id/detalles', obtenerDetalles);
router.patch('/:id/estado', actualizarEstadoPedido);  // ⬅️ /api/pedidos/:id/estado

module.exports = router;
