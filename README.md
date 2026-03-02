# BackendMarketplace

## Setup inicial (Primera vez)
1. Clonar el repositorio `git clone https://github.com/CrisNAC/BackendMarketplace.git`
2. `npm install`
3. Agregar el archivo `.env` en la raíz del proyecto `/BackendMarketplace/.env` (pedir las credenciales a Kisser)
4. `npx prisma generate` — genera el Prisma Client
5. `npm run dev`

## Actualizar el proyecto (git pull)
1. `git pull origin dev`
2. Resolver conflictos si los hay y mergear
3. `npm install` — por si se agregaron nuevas dependencias
4. `npx prisma generate` — por si se modificó el schema
5. `npm run dev`

## Si se modifica el schema.prisma
> ⚠️ Hablar con Kisser antes de modificar el schema y hacer una migración nueva

1. `npx prisma migrate dev` — aplica los cambios a la base de datos en Supabase
2. `npx prisma generate` — actualiza el Prisma Client
3. Hacer commit y push de la carpeta `prisma/migrations/` junto con el `schema.prisma`

## Convenciones del schema.prisma

### Modelos (Tablas)
- Nombres en **inglés**
- Nombres en **PascalCase**
- Nombres en **plural** — `Users`, `Orders`, `Products`

### Campos
- Nombres en **inglés**
- Nombres en **snake_case** — `created_at`, `password_hash`
- IDs con prefijo `id_` + nombre del modelo en singular — `id_user`, `id_order`, `id_product`
- Foreign keys con prefijo `fk_` + nombre del modelo referenciado en singular — `fk_user`, `fk_store`, `fk_product`

### Campos obligatorios en todos los modelos
- `status Boolean @default(true)` — para borrado lógico, nunca eliminar registros
- `created_at DateTime @default(now()) @db.Timestamptz` — fecha de creación automática
- `updated_at DateTime @updatedAt @db.Timestamptz` — fecha de actualización automática

### Tipos de datos
- IDs — `Int @id @default(autoincrement())`
- Textos cortos — `@db.VarChar(n)`
- Textos largos — `@db.Text`
- Precios — `Decimal @db.Decimal(10, 2)`
- URLs — `@db.VarChar(500)`
- Booleanos — `Boolean` (nunca SmallInt)
- Fechas — `DateTime @db.Timestamptz`

### Relaciones
- Los campos de relación virtual van al final del modelo separados por un comentario `// Relations`
- Relaciones 1 a 1 opcionales con `?` — `store Stores?`
- Relaciones 1 a N con `[]` — `orders Orders[]`
- Tablas pivot con sufijo `Relations` — `ProductTagRelations`, `ProductCollections`

### Enums
- Nombres en **PascalCase** — `Role`, `OrderStatus`, `DeliveryStatus`
- Valores en **UPPER_CASE** — `ADMIN`, `PROCESSING`, `ON_THE_WAY`