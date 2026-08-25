-- TipoUnidad deja de ser un enum y pasa a ser un maestro configurable desde
-- Parámetros del sistema, conservando el tipo actual de cada unidad.
--
-- El orden importa: en PostgreSQL una tabla y un enum comparten espacio de
-- nombres, así que no se puede crear la tabla "TipoUnidad" mientras exista el
-- enum homónimo. Y el enum no se puede eliminar mientras alguna columna lo
-- use. Por eso primero se pasan los valores a texto, luego se elimina el enum,
-- y sólo entonces se crea la tabla.

-- 1. Soltar la dependencia del enum, guardando el valor en texto
ALTER TABLE "Unidad" ADD COLUMN "tipoCodigo" TEXT;
UPDATE "Unidad" SET "tipoCodigo" = "tipo"::text;
ALTER TABLE "Unidad" DROP COLUMN "tipo";

ALTER TABLE "TarifaCuota" ADD COLUMN "tipoUnidadCodigo" TEXT;
UPDATE "TarifaCuota" SET "tipoUnidadCodigo" = "tipoUnidad"::text;
ALTER TABLE "TarifaCuota" DROP COLUMN "tipoUnidad";

-- 2. Ya nadie referencia el enum
DROP TYPE "TipoUnidad";

-- 3. El maestro, sembrado con los valores que existían
CREATE TABLE "TipoUnidad" (
    "id"     TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden"  INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TipoUnidad_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TipoUnidad_codigo_key" ON "TipoUnidad"("codigo");

INSERT INTO "TipoUnidad" ("id", "codigo", "nombre", "orden", "activo") VALUES
    (gen_random_uuid()::text, 'CASA',    'Casa',                  1, true),
    (gen_random_uuid()::text, 'TERRENO', 'Terreno sin construir', 2, true);

-- 4. Unidad: se rellena desde el texto antes de exigir NOT NULL
ALTER TABLE "Unidad" ADD COLUMN "tipoId" TEXT;
UPDATE "Unidad" u
   SET "tipoId" = t."id"
  FROM "TipoUnidad" t
 WHERE t."codigo" = u."tipoCodigo";
ALTER TABLE "Unidad" ALTER COLUMN "tipoId" SET NOT NULL;
ALTER TABLE "Unidad" DROP COLUMN "tipoCodigo";
ALTER TABLE "Unidad"
    ADD CONSTRAINT "Unidad_tipoId_fkey"
    FOREIGN KEY ("tipoId") REFERENCES "TipoUnidad"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. TarifaCuota: mismo cambio (columna opcional)
ALTER TABLE "TarifaCuota" ADD COLUMN "tipoUnidadId" TEXT;
UPDATE "TarifaCuota" tc
   SET "tipoUnidadId" = t."id"
  FROM "TipoUnidad" t
 WHERE t."codigo" = tc."tipoUnidadCodigo";
ALTER TABLE "TarifaCuota" DROP COLUMN "tipoUnidadCodigo";
ALTER TABLE "TarifaCuota"
    ADD CONSTRAINT "TarifaCuota_tipoUnidadId_fkey"
    FOREIGN KEY ("tipoUnidadId") REFERENCES "TipoUnidad"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
