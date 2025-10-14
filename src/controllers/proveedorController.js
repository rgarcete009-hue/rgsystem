const Proveedor = require('../models/Proveedor'); // Importa el modelo Proveedor

// Crear un nuevo proveedor
exports.crearProveedor = async (req, res) => {
  try {
    const nuevoProveedor = await Proveedor.create(req.body);
    res.status(201).json(nuevoProveedor);
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear proveedor', error: error.message });
  }
};

// Obtener todos los proveedores
exports.obtenerTodosLosProveedores = async (req, res) => {
  try {
    const proveedores = await Proveedor.findAll();
    res.status(200).json(proveedores);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener proveedores', error: error.message });
  }
};

// Obtener un proveedor por ID
exports.obtenerProveedorPorId = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.status(200).json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener proveedor', error: error.message });
  }
};

// Actualizar un proveedor por ID
exports.actualizarProveedor = async (req, res) => {
  try {
    const [updated] = await Proveedor.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedProveedor = await Proveedor.findByPk(req.params.id);
      res.status(200).json(updatedProveedor);
    } else {
      res.status(404).json({ message: 'Proveedor no encontrado para actualizar' });
    }
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar proveedor', error: error.message });
  }
};

// Eliminar un proveedor por ID
exports.eliminarProveedor = async (req, res) => {
  try {
    const deleted = await Proveedor.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ message: 'Proveedor no encontrado para eliminar' });
    }
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar proveedor', error: error.message });
  }
};