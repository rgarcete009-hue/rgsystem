const service = require('../services/productoService');

exports.crear = async (req, res) => {
  try {
    const nuevo = await service.crearProducto(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listar = async (_req, res) => {
  try {
    const productos = await service.obtenerProductos();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const producto = await service.obtenerProductoPorId(req.params.id);
    if (!producto) return res.status(404).json({ error: 'No encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const actualizado = await service.actualizarProducto(req.params.id, req.body);
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminarProducto(req.params.id);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
