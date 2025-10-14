// src/controllers/mesasController.js
const { Op } = require('sequelize');
const { Mesa, Pedido } = require('../models');

const listarMesas = async (req, res) => {
  try {
    const { sector, tipo } = req.query; // tipo opcional: 'mesa' | 'terraza'
    const whereMesa = {};
    if (sector && String(sector).trim() !== '') {
      whereMesa.sector = { [Op.iLike]: String(sector).trim() };
    }
    const tipoPedido = ['mesa', 'terraza'].includes(String(tipo)) ? String(tipo) : 'mesa';

    const mesas = await Mesa.findAll({
      where: whereMesa,
      include: [{
        model: Pedido,
        where: { estado: 'abierto', tipo: tipoPedido },
        required: false,
        attributes: ['id'],
      }],
      order: [['nombre', 'ASC']],
    });

    const data = mesas.map(m => ({
      id: m.id,
      nombre: m.nombre,
      estado: m.estado,
      sector: m.sector ?? null,
      pedido_abierto_id: (m.Pedidos && m.Pedidos[0]) ? m.Pedidos[0].id : null,
    }));

    res.json(data);
  } catch (e) {
    console.error('listarMesas error:', e);
    res.status(500).json({ message: e.message });
  }
};

module.exports = { listarMesas };
