// src/routes/ventas.js
const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');

/**
 * IMPORTANTE:
 * Este router se asume montado como: app.use('/api/ventas', router)
 * Por eso todas las rutas aquí SON RELATIVAS a /api/ventas
 *   - /resumen            -> GET /api/ventas/resumen
 *   - /                   -> GET /api/ventas
 *   - /:id(\\d+)          -> GET /api/ventas/123
 */

// 1) Rutas específicas (antes que :id)
router.get('/cierres/arqueo', ventaController.generarArqueo);
router.post('/cierres/registrar', ventaController.registrarCierreGlobal);
router.get('/cierres', ventaController.listarCierresGlobales);

// 2) Resumen (colocarla ANTES de cualquier :id)
router.get('/resumen', ventaController.resumenVentas);

// 3) Subrutas que dependen de :id (restringimos a enteros)
router.get('/:id(\\d+)/pdf', ventaController.generarFacturaPDF);
router.put('/:id(\\d+)/anular', ventaController.anularVenta);

// 4) Crear venta (POST raíz)
router.post('/', ventaController.crearVenta);

// 5) Obtener venta por ID (al final, pero ANTES de GET raíz no es obligatorio;
//    lo importante es que /resumen quede antes de :id)
router.get('/:id(\\d+)', ventaController.obtenerVentaPorId);

// 6) Listado (GET raíz) – genérica
router.get('/', ventaController.listarVentas);

module.exports = router;
