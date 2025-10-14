// createUser.js
const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database'); // ajustá si tu ruta es distinta
const User = require('./src/models/User'); // ajustá si tu modelo está en otra carpeta

async function createUser() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // asegura que la tabla exista

    const hashedPassword = await bcrypt.hash('admin123', 10); // contraseña segura

    const user = await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Usuario creado:', user.username);
  } catch (error) {
    console.error('❌ Error al crear el usuario:', error);
  } finally {
    await sequelize.close();
  }
}

createUser();
