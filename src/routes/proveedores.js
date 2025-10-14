// src/routes/proveedores.js
const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController'); // Asume que tendrás un controlador para proveedores

// Rutas para Proveedores
router.post('/', proveedorController.crearProveedor); // Crear un nuevo proveedor
router.get('/', proveedorController.obtenerTodosLosProveedores); // Obtener todos los proveedores
router.get('/:id', proveedorController.obtenerProveedorPorId); // Obtener un proveedor por ID
router.put('/:id', proveedorController.actualizarProveedor); // Actualizar un proveedor por ID
router.delete('/:id', proveedorController.eliminarProveedor); // Eliminar un proveedor por ID

module.exports = router;