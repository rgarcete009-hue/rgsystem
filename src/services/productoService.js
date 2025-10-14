const Producto = require('../models/Producto');

const crearProducto = async (data) => {
  return await Producto.create(data);
};

const obtenerProductos = async () => {
  return await Producto.findAll({ where: { activo: true } });
};

const obtenerProductoPorId = async (id) => {
  return await Producto.findByPk(id);
};

const actualizarProducto = async (id, data) => {
  const producto = await Producto.findByPk(id);
  if (!producto) throw new Error('Producto no encontrado');
  return await producto.update(data);
};

const eliminarProducto = async (id) => {
  const producto = await Producto.findByPk(id);
  if (!producto) throw new Error('Producto no encontrado');
  return await producto.update({ activo: false }); // Baja lógica
};

module.exports = {
  crearProducto,
  obtenerProductos,
  obtenerProductoPorId,
  actualizarProducto,
  eliminarProducto
};
