const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/index'); // Importa el enrutador principal

const app = express();

// Orígenes permitidos para el frontend
const allowedOrigins = [
  'http://localhost:3005',
  'http://192.168.0.14:3005',
  'http://192.168.0.14:3005'
];

// Configuración de CORS con control de origen y credenciales
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json());

// Ruta básica para verificar que el sistema esté iniciado
app.get('/', (req, res) => {
  res.send('API del Sistema de Ventas Iniciada y Funcionando.');
});

// Registrar todas las rutas de la API bajo el prefijo /api
app.use('/api', apiRoutes);

// Middleware para rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal en el servidor.',
    message: err.message
  });
});

module.exports = app;