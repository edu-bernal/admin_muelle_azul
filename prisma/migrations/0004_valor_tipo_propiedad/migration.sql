-- El monto por tipo de propiedad pasa a vivir en el propio tipo: es la cuota
-- mensual que la emisión generará para sus unidades. Con ello, acotar una
-- tarifa por tipo dejaría de tener sentido (serían dos fuentes para el mismo
-- dato), así que esa columna se elimina. Hoy ninguna tarifa la usa.

ALTER TABLE "TipoUnidad" ADD COLUMN "valor" DECIMAL(12,2);

ALTER TABLE "TarifaCuota" DROP CONSTRAINT IF EXISTS "TarifaCuota_tipoUnidadId_fkey";
ALTER TABLE "TarifaCuota" DROP COLUMN "tipoUnidadId";
