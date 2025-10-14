"use strict";
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (qi) {
    const now = new Date();
    const filas = Array.from({ length: 25 }, (_, k) => ({
      id: uuidv4(),
      nombre: `T${k + 1}`,
      sector: 'terraza',
      estado: 'libre',
      created_at: now,
      updated_at: now,
    }));
    await qi.bulkInsert('mesas', filas);
  },
  async down (qi) {
    await qi.bulkDelete('mesas', { sector: 'terraza' });
  }
};
