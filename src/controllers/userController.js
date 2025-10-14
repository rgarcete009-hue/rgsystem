const bcrypt = require('bcryptjs');
const User = require('../models/User');

const userController = {};

// Listar usuarios
userController.list = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'username', 'role'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

// Crear usuario
userController.create = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, role });
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Editar usuario
userController.update = async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  try {
    const updateData = { username, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await User.update(updateData, { where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar usuario
userController.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await User.destroy({ where: { id } });
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

module.exports = userController;