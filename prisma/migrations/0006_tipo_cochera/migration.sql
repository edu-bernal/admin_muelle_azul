-- Tipo COCHERA para el mantenimiento de cocheras dentro de cada propiedad.
-- Se crea con valor 0 a propósito: una cochera es una unidad más y recibiría
-- su propia cuota en cada emisión, así que dejarlo en 0 evita cobrar de más
-- por accidente. El monto real se define en Parámetros del sistema.
INSERT INTO "TipoUnidad" ("id", "codigo", "nombre", "valor", "orden", "activo")
SELECT gen_random_uuid()::text, 'COCHERA', 'Cochera', 0, 3, true
WHERE NOT EXISTS (SELECT 1 FROM "TipoUnidad" WHERE "codigo" = 'COCHERA');
