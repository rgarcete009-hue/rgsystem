const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Listar usuarios
router.get('/', userController.list);

// Crear usuario
router.post('/', userController.create);

// Editar usuario
router.put('/:id', userController.update);


router.delete('/:id', userController.delete);

module.exports = router;