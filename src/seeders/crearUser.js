const bcrypt = require('bcrypt');
const User = require('./src/models/User'); // Ajustá si tu modelo está en otra ruta
const { sequelize } = require('./src/config/database'); // Asegurate que esta ruta sea correcta

async function createAdminArtes() {
  try {
    console.log('🔐 Iniciando creación de usuario "artes" con rol admin...');

    await sequelize.authenticate();
    await sequelize.sync(); // Crea la tabla si no existe

    const username = 'artes';
    const password = 'admin123'; // Podés cambiarla luego desde el panel
    const role = 'admin';

    // Verificar si ya existe
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log(`⚠️ El usuario "${username}" ya existe. No se creó uno nuevo.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      role
    });

    console.log(`✅ Usuario "${user.username}" creado con rol "${user.role}".`);
  } catch (error) {
    console.error('❌ Error al crear el usuario:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada.');
  }
}

createAdminArtes();