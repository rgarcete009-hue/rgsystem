// src/controllers/mesasController.js 
const { Mesa } = require('../models'); 
const listarMesas = async (req, res) => { 
 try { 
 const mesas = await Mesa.findAll({ 
 attributes: ['id', 'nombre', 'estado', 'tipo', 'pedido_abierto_id'], 
 order: [['nombre', 'ASC']], 
 }); 
 res.json(mesas); 
 } catch (e) { 
 console.error('listarMesas error:', e); 
 res.status(500).json({ message: e.message }); 
 } 
}; 
module.exports = { listarMesas };