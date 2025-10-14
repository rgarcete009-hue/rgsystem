const Cliente = require('../models/Cliente');
const { sequelize } = require('../config/database');

const seedClientes = async () => {
  try {
    await sequelize.sync();

    const clientes = [
      {
        nombre: 'Juan Pérez',
        ruc: '1234567-8',
        direccion: 'Av. Mcal. López 123',
        telefono: '0981123456',
      },
      {
        nombre: 'Maria Gómez',
        ruc: '2345678-9',
        direccion: 'Calle Palma 456',
        telefono: '0972123456',
      },
      {
        nombre: 'Empresa XYZ S.A.',
        ruc: '80012345-6',
        direccion: 'Avda. España 789',
        telefono: '021223344',
      },
    ];

    await Cliente.bulkCreate(clientes, { ignoreDuplicates: true });
    console.log('✅ Clientes cargados exitosamente');
    process.exit();
  } catch (error) {
    console.error('❌ Error al cargar clientes:', error);
    process.exit(1);
  }
};

seedClientes();
