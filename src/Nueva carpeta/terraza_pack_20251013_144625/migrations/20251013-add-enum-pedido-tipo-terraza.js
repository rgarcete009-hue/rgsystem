"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_pedidos_tipo'
            AND e.enumlabel = 'terraza'
        ) THEN
          ALTER TYPE "enum_pedidos_tipo" ADD VALUE 'terraza';
        END IF;
      END$$;
    `);
  },
  async down() {
    // No reversible: si necesitás un down real, recreá el tipo sin 'terraza'.
  }
};
