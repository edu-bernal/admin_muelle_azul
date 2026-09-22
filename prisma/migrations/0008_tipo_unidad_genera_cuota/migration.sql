-- Las cocheras no pagan cuota de mantenimiento: en vez de emitirles un cargo
-- de S/ 0 cada mes, el tipo declara que no genera cuota y la emisión lo omite.
ALTER TABLE "TipoUnidad" ADD COLUMN "generaCuota" BOOLEAN NOT NULL DEFAULT true;

UPDATE "TipoUnidad" SET "generaCuota" = false WHERE "codigo" = 'COCHERA';
