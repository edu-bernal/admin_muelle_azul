-- Fecha de compra de la propiedad. Opcional: el padrón histórico no la trae,
-- así que las 425 unidades existentes quedan sin ella hasta que se registre.
ALTER TABLE "Unidad" ADD COLUMN "fechaAdquisicion" TIMESTAMP(3);
