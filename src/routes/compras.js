const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');

router.post('/', compraController.crearCompra);
router.get('/', compraController.listarCompras);
router.get('/:id', compraController.obtenerCompraPorId);
router.put('/:id', compraController.actualizarCompra);
router.delete('/:id', compraController.eliminarCompra);

module.exports = router;