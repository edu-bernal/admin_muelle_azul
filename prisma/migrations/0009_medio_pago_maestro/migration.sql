-- MedioPago deja de ser un enum y pasa a ser un maestro configurable desde
-- Parámetros del sistema. Pago, IngresoVario y Egreso siguen guardando el
-- código del medio (TRANSFERENCIA, YAPE...), ahora como texto con llave
-- foránea al maestro, así que los datos existentes no cambian.
--
-- Mismo orden que en 0003: la tabla y el enum comparten espacio de nombres,
-- y el enum no se puede eliminar mientras alguna columna lo use.

-- 1. Las columnas pasan a texto conservando su valor
ALTER TABLE "Pago"         ALTER COLUMN "medio" TYPE TEXT USING "medio"::text;
ALTER TABLE "IngresoVario" ALTER COLUMN "medio" DROP DEFAULT;
ALTER TABLE "IngresoVario" ALTER COLUMN "medio" TYPE TEXT USING "medio"::text;
ALTER TABLE "IngresoVario" ALTER COLUMN "medio" SET DEFAULT 'EFECTIVO';
ALTER TABLE "Egreso"       ALTER COLUMN "medio" DROP DEFAULT;
ALTER TABLE "Egreso"       ALTER COLUMN "medio" TYPE TEXT USING "medio"::text;
ALTER TABLE "Egreso"       ALTER COLUMN "medio" SET DEFAULT 'TRANSFERENCIA';

-- 2. Ya nadie referencia el enum
DROP TYPE "MedioPago";

-- 3. El maestro, sembrado con los valores que existían
CREATE TABLE "MedioPago" (
    "id"      TEXT NOT NULL,
    "codigo"  TEXT NOT NULL,
    "nombre"  TEXT NOT NULL,
    "portal"  BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "orden"   INTEGER NOT NULL DEFAULT 0,
    "activo"  BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MedioPago_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MedioPago_codigo_key" ON "MedioPago"("codigo");

INSERT INTO "MedioPago" ("id", "codigo", "nombre", "portal", "sistema", "orden") VALUES
    (gen_random_uuid()::text, 'TRANSFERENCIA', 'Transferencia',       true,  false, 1),
    (gen_random_uuid()::text, 'DEPOSITO',      'Depósito BBVA',       true,  false, 2),
    (gen_random_uuid()::text, 'YAPE',          'Yape',                true,  false, 3),
    (gen_random_uuid()::text, 'PLIN',          'Plin',                true,  false, 4),
    (gen_random_uuid()::text, 'EFECTIVO',      'Efectivo',            true,  false, 5),
    (gen_random_uuid()::text, 'CHEQUE',        'Cheque',              false, false, 6),
    (gen_random_uuid()::text, 'PASARELA',      'Pasarela de pago',    false, true,  90),
    (gen_random_uuid()::text, 'MIGRACION',     'Migración histórica', false, true,  91);

-- 4. Llaves foráneas por código: un medio en uso no se puede borrar
ALTER TABLE "Pago"
    ADD CONSTRAINT "Pago_medio_fkey"
    FOREIGN KEY ("medio") REFERENCES "MedioPago"("codigo")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IngresoVario"
    ADD CONSTRAINT "IngresoVario_medio_fkey"
    FOREIGN KEY ("medio") REFERENCES "MedioPago"("codigo")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Egreso"
    ADD CONSTRAINT "Egreso_medio_fkey"
    FOREIGN KEY ("medio") REFERENCES "MedioPago"("codigo")
    ON DELETE RESTRICT ON UPDATE CASCADE;
