# Pack Terraza - POS

Este paquete añade el modo **Terraza** reutilizando el modelo `Mesa` con `sector='terraza'`, crea mesas `T1..T25`, habilita abrir/cobrar/cancelar pedidos por mesa en Terraza e integra filtros/reportes.

## Archivos incluidos

- `migrations/20251013-add-enum-pedido-tipo-terraza.js` → agrega `'terraza'` al ENUM `pedidos.tipo`.
- `seeders/20251013-seed-terraza-mesas.js` → crea mesas `T1..T25` (sector `terraza`).
- `src/controllers/pedidosController.js` → acepta `tipo='terraza'`, valida sector, ocupa/libera.
- `src/controllers/mesasController.js` → soporta `?sector` y `?tipo` para pedido abierto.
- `src/controllers/ventasController.js` → libera mesa también en `terraza` y filtra `tipo=terraza`.
- `src/pages/Ventas.js` → patch base con bloques para pestaña Terraza, carga/refresco y abrir pedido (integrar con tu archivo completo).

> **Nota Frontend:** El `src/pages/Ventas.js` aquí es **parcial** (patch/bloques**)** para facilitar el merge con tu archivo actual (muy extenso). Insertá los bloques indicados en tu `Ventas.js` real. Si querés que te genere el archivo completo ya mergeado, compartime nuevamente tu `Ventas.js` definitivo y te devuelvo un reemplazo 1:1.

## Pasos

1. **Backup & branch**
```bash
git switch -c feature/terraza
```

2. **Migraciones y seed**
```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

3. **Opcional (recomendado) - Unicidad sector+nombre**
```sql
ALTER TABLE mesas
ADD CONSTRAINT mesas_sector_nombre_uniq UNIQUE (sector, nombre);
```

4. **Reiniciar backend**
```bash
pm2 restart <proceso>  # o npm run dev
```

5. **Probar**
- UI → pestaña **Terraza**: ver "Mesa T1..T25".
- Abrir pedido Terraza sobre T1 → queda "ocupada".
- Agregar ítems y **Cobrar** → se crea venta y se **libera** la mesa.
- **Cancelar** un pedido de Terraza → **libera** la mesa.
- `/api/ventas?tipo=terraza` → lista ventas de Terraza.
- Resumen de ventas → aparece `terraza` en `por_tipo` automáticamente.

## Notas
- Si tu tipo ENUM no se llama `enum_pedidos_tipo`, avisá y ajusto la migración.
- Si querés, puedo generar un **archivo completo de `src/pages/Ventas.js`** ya mergeado con tus helpers/QZ/ESC-POS (lo omití para no sobreescribir lógicas específicas).
