const express = require('express');
const router = express.Router();

// Importar todos los enrutadores
const productoRoutes = require('./productoRoutes');
const ventasRoutes = require('./ventas');
const inventarioRoutes = require('./inventarioRoutes');
const clientesRoutes = require('./clientes');
const comprasRoutes = require('./compras');
const proveedoresRoutes = require('./proveedores');
const facturaRoutes = require('./facturaRoutes');
const configuracionEmpresaRoutes = require('./configuracionEmpresaRoutes');
const reportesRoutes = require('./reportesRoutes');
const cajaRoutes = require('./caja');
const authRoutes = require('./auth');
const userRoutes = require('./userRoutes');
const mesasRoutes = require('./mesas');
const pedidosRoutes = require('./pedidos');

// Registrar las rutas en el enrutador principal
router.use('/productos', productoRoutes);
router.use('/ventas', ventasRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/clientes', clientesRoutes);
router.use('/compras', comprasRoutes);
router.use('/proveedores', proveedoresRoutes);
router.use('/factura', facturaRoutes);
router.use('/configuracion', configuracionEmpresaRoutes);
router.use('/reportes', reportesRoutes);
router.use('/caja', cajaRoutes);
router.use('/usuarios', userRoutes);
router.use('/auth', authRoutes);
router.use('/mesas', mesasRoutes);
router.use('/pedidos', pedidosRoutes);

module.exports = router;