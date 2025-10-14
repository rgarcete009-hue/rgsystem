require('dotenv').config();

const os = require('os');
const app = require('./app');
const { sequelize } = require('./models/index');

const PORT = process.env.PORT || 3002;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function main() {
  try {
    await sequelize.sync({ alter: false });
    console.log('✅ Modelos sincronizados con la base de datos.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://${getLocalIP()}:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error al conectar o sincronizar con la base de datos:', error);
    process.exit(1);
  }
}

main();
