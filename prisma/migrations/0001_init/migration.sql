-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('INVITADO', 'ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'CE', 'RUC', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "CanalEnvio" AS ENUM ('CORREO', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('CASA', 'TERRENO');

-- CreateEnum
CREATE TYPE "BaseCalculoCuota" AS ENUM ('ALICUOTA', 'FIJO', 'M2');

-- CreateEnum
CREATE TYPE "EstadoOcupacion" AS ENUM ('PROPIETARIO', 'ALQUILADA', 'DESOCUPADA', 'EN_VENTA');

-- CreateEnum
CREATE TYPE "EstadoEmision" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoCargo" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('POR_VALIDAR', 'CONFIRMADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('TRANSFERENCIA', 'YAPE', 'PLIN', 'EFECTIVO', 'DEPOSITO', 'CHEQUE', 'PASARELA', 'MIGRACION');

-- CreateEnum
CREATE TYPE "DeclaradoPor" AS ENUM ('ADMIN', 'PROPIETARIO');

-- CreateEnum
CREATE TYPE "SerieRecibo" AS ENUM ('CAJA', 'VARIOS');

-- CreateEnum
CREATE TYPE "EstadoIngresoVario" AS ENUM ('REGISTRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoServicioUnidad" AS ENUM ('VIGILANCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoServicioUnidad" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "Periodicidad" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'ANUAL', 'VARIABLE');

-- CreateEnum
CREATE TYPE "EstadoServicioTercero" AS ENUM ('VIGENTE', 'SUSPENDIDO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('FACTURA', 'RHE', 'BOLETA', 'RECIBO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA_PARCIAL', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoTrabajador" AS ENUM ('ADMINISTRATIVO', 'MANTENIMIENTO', 'VIGILANCIA');

-- CreateEnum
CREATE TYPE "EstadoPlanilla" AS ENUM ('ABIERTA', 'CERRADA', 'PAGADA');

-- CreateEnum
CREATE TYPE "EstadoPagoDetalle" AS ENUM ('PENDIENTE', 'PAGADO');

-- CreateEnum
CREATE TYPE "EstadoAdelanto" AS ENUM ('PENDIENTE', 'DESCONTADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoOrigenEgreso" AS ENUM ('FACTURA_PROVEEDOR', 'OBLIGACION_SERVICIO', 'PLANILLA_DETALLE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoEgreso" AS ENUM ('REGISTRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EMAIL', 'PANEL');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('SOLICITADA', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "PrioridadIncidencia" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "CategoriaIncidencia" AS ENUM ('ELECTRICO', 'SANITARIO', 'PISCINA', 'JARDINES', 'SEGURIDAD', 'LIMPIEZA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('REPORTADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_EJECUCION', 'RESUELTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoMulta" AS ENUM ('NOTIFICADA', 'EN_DESCARGO', 'CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoVisita" AS ENUM ('VISITA', 'DELIVERY', 'PROVEEDOR', 'OBRERO', 'INQUILINO');

-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'APROBADO');

-- CreateEnum
CREATE TYPE "PonderacionVoto" AS ENUM ('ALICUOTA', 'UNIDAD');

-- CreateEnum
CREATE TYPE "EstadoVotacion" AS ENUM ('BORRADOR', 'ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "VisibilidadDocumento" AS ENUM ('PUBLICO_PROPIETARIOS', 'SOLO_ADMIN');

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "nombreCompleto" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "propietarioId" TEXT,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'INVITADO',
    "twoFaSecret" TEXT,
    "activationToken" TEXT,
    "activationExpires" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condominio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "distrito" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "logoUrl" TEXT,

    CONSTRAINT "Condominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propietario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento",
    "numeroDocumento" TEXT,
    "email" TEXT,
    "emailSecundario" TEXT,
    "telefono" TEXT,
    "telefonoSecundario" TEXT,
    "canalEnvio" "CanalEnvio" NOT NULL DEFAULT 'CORREO',
    "direccionHabitual" TEXT,
    "contactoEmergencia" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "manzana" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "tipo" "TipoUnidad" NOT NULL DEFAULT 'CASA',
    "areaM2" DECIMAL(8,2),
    "alicuota" DECIMAL(7,4),
    "baseCalculoCuota" "BaseCalculoCuota",
    "montoFijoCuota" DECIMAL(12,2),
    "unidadPrincipalId" TEXT,
    "estadoOcupacion" "EstadoOcupacion" NOT NULL DEFAULT 'PROPIETARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropiedadTitularidad" (
    "id" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "esResponsablePago" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "PropiedadTitularidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaCuota" (
    "id" TEXT NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "tipoUnidad" "TipoUnidad",
    "sectorId" TEXT,
    "montoMensual" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "TarifaCuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoCobro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "generaMora" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConceptoCobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emision" (
    "id" TEXT NOT NULL,
    "conceptoCobroId" TEXT NOT NULL,
    "periodo" TIMESTAMP(3) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoEmision" NOT NULL DEFAULT 'BORRADOR',
    "totalEmitido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cantidadCargos" INTEGER NOT NULL DEFAULT 0,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Emision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "conceptoCobroId" TEXT NOT NULL,
    "emisionId" TEXT,
    "periodo" TIMESTAMP(3),
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCargo" NOT NULL DEFAULT 'PENDIENTE',
    "cargoOrigenId" TEXT,
    "anuladoPorId" TEXT,
    "anuladoMotivo" TEXT,
    "anuladoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DECIMAL(8,4),
    "medio" "MedioPago" NOT NULL,
    "banco" TEXT,
    "numeroOperacion" TEXT,
    "voucherArchivoId" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'POR_VALIDAR',
    "declaradoPor" "DeclaradoPor" NOT NULL DEFAULT 'ADMIN',
    "validadoPorId" TEXT,
    "validadoAt" TIMESTAMP(3),
    "rechazoMotivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AplicacionPago" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "montoAplicado" DECIMAL(12,2) NOT NULL,
    "aplicadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aplicadoPorId" TEXT,

    CONSTRAINT "AplicacionPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReciboCaja" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "serie" "SerieRecibo" NOT NULL DEFAULT 'CAJA',
    "pagoId" TEXT,
    "ingresoVarioId" TEXT,
    "detallePeriodos" TEXT,
    "emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitidoPorId" TEXT,
    "reimpresiones" INTEGER NOT NULL DEFAULT 0,
    "pdfArchivoId" TEXT,

    CONSTRAINT "ReciboCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoFavor" (
    "id" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "montoDisponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaldoFavor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoFavorMovimiento" (
    "id" TEXT NOT NULL,
    "saldoFavorId" TEXT NOT NULL,
    "pagoId" TEXT,
    "cargoId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "signo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaldoFavorMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngresoVario" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadId" TEXT,
    "propietarioId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio" "MedioPago" NOT NULL DEFAULT 'EFECTIVO',
    "numeroOperacion" TEXT,
    "estado" "EstadoIngresoVario" NOT NULL DEFAULT 'REGISTRADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngresoVario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioUnidad" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "tipo" "TipoServicioUnidad" NOT NULL DEFAULT 'VIGILANCIA',
    "tarifaMensual" DECIMAL(12,2) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoServicioUnidad" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "ServicioUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "ruc" TEXT,
    "rubro" TEXT,
    "contactoNombre" TEXT,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "cuentasBancarias" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPresupuesto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PartidaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioTercero" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "partidaId" TEXT,
    "periodicidad" "Periodicidad" NOT NULL DEFAULT 'MENSUAL',
    "montoReferencial" DECIMAL(12,2),
    "diaPago" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFinContrato" TIMESTAMP(3),
    "estado" "EstadoServicioTercero" NOT NULL DEFAULT 'VIGENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicioTercero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL DEFAULT 'FACTURA',
    "serieNumero" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "detalle" TEXT,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "puesto" TEXT NOT NULL,
    "tipo" "TipoTrabajador" NOT NULL DEFAULT 'MANTENIMIENTO',
    "tipoContrato" TEXT,
    "fechaIngreso" TIMESTAMP(3),
    "fechaCese" TIMESTAMP(3),
    "sueldoBase" DECIMAL(12,2) NOT NULL,
    "cuentaBancaria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planilla" (
    "id" TEXT NOT NULL,
    "periodo" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPlanilla" NOT NULL DEFAULT 'ABIERTA',
    "totalNeto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Planilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanillaDetalle" (
    "id" TEXT NOT NULL,
    "planillaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "sueldoBase" DECIMAL(12,2) NOT NULL,
    "bonificaciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horasExtra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adelantosDescontados" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netoPagar" DECIMAL(12,2) NOT NULL,
    "estadoPago" "EstadoPagoDetalle" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "PlanillaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adelanto" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "saldoPendiente" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoAdelanto" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "Adelanto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egreso" (
    "id" TEXT NOT NULL,
    "tipoOrigen" "TipoOrigenEgreso" NOT NULL DEFAULT 'OTRO',
    "origenId" TEXT,
    "partidaId" TEXT,
    "descripcion" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio" "MedioPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "numeroOperacion" TEXT,
    "estado" "EstadoEgreso" NOT NULL DEFAULT 'REGISTRADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Egreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivo" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "subidoPorId" TEXT,
    "entidadTipo" TEXT,
    "entidadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "canal" "CanalNotificacion" NOT NULL DEFAULT 'PANEL',
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "referencia" TEXT,
    "enviadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "audiencia" JSONB,
    "requiereConfirmacion" BOOLEAN NOT NULL DEFAULT false,
    "publicadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComunicadoLectura" (
    "id" TEXT NOT NULL,
    "comunicadoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComunicadoLectura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaComun" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "aforo" INTEGER,
    "tarifa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT true,
    "reglas" JSONB,
    "horario" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AreaComun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "solicitanteId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "numPersonas" INTEGER,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'SOLICITADA',
    "cargoId" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidadId" TEXT,
    "categoria" "CategoriaIncidencia" NOT NULL DEFAULT 'OTRO',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "PrioridadIncidencia" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'REPORTADA',
    "asignadoTipo" TEXT,
    "asignadoId" TEXT,
    "costoEstimado" DECIMAL(12,2),
    "reportadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenciaEvento" (
    "id" TEXT NOT NULL,
    "incidenciaId" TEXT NOT NULL,
    "estado" "EstadoIncidencia" NOT NULL,
    "comentario" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidenciaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Infraccion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "montoMin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoMax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Infraccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Multa" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "infraccionId" TEXT,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "evidencias" JSONB,
    "estado" "EstadoMulta" NOT NULL DEFAULT 'NOTIFICADA',
    "cargoId" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Multa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visita" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "placa" TEXT,
    "tipo" "TipoVisita" NOT NULL DEFAULT 'VISITA',
    "preautorizada" BOOLEAN NOT NULL DEFAULT false,
    "preautorizadaPorId" TEXT,
    "ingresoAt" TIMESTAMP(3),
    "salidaAt" TIMESTAMP(3),
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutorizacionPermanente" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "personaNombre" TEXT NOT NULL,
    "personaDoc" TEXT,
    "tipo" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AutorizacionPermanente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "color" TEXT,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoAnual" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresupuestoAnual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoPartida" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "montoAnual" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PresupuestoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Votacion" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "descripcion" TEXT,
    "opciones" JSONB NOT NULL,
    "ponderacion" "PonderacionVoto" NOT NULL DEFAULT 'UNIDAD',
    "estado" "EstadoVotacion" NOT NULL DEFAULT 'BORRADOR',
    "abreAt" TIMESTAMP(3),
    "cierraAt" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Votacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voto" (
    "id" TEXT NOT NULL,
    "votacionId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "opcion" TEXT NOT NULL,
    "peso" DECIMAL(9,4) NOT NULL DEFAULT 1,
    "emitidoPorId" TEXT,
    "emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "carpeta" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT,
    "archivoId" TEXT,
    "visibilidad" "VisibilidadDocumento" NOT NULL DEFAULT 'PUBLICO_PROPIETARIOS',
    "version" INTEGER NOT NULL DEFAULT 1,
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medidor" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'AGUA',
    "codigo" TEXT,

    CONSTRAINT "Medidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturaMedidor" (
    "id" TEXT NOT NULL,
    "medidorId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "periodo" TIMESTAMP(3) NOT NULL,
    "lecturaAnt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lecturaAct" DECIMAL(12,2) NOT NULL,
    "consumo" DECIMAL(12,2) NOT NULL,
    "cargoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturaMedidor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_codigo_key" ON "Rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_codigo_key" ON "Permiso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_activationToken_key" ON "Usuario"("activationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_resetToken_key" ON "Usuario"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_codigo_key" ON "Sector"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_tipoDocumento_numeroDocumento_key" ON "Propietario"("tipoDocumento", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_codigo_key" ON "Unidad"("codigo");

-- CreateIndex
CREATE INDEX "Unidad_sectorId_idx" ON "Unidad"("sectorId");

-- CreateIndex
CREATE INDEX "PropiedadTitularidad_unidadId_idx" ON "PropiedadTitularidad"("unidadId");

-- CreateIndex
CREATE INDEX "PropiedadTitularidad_propietarioId_idx" ON "PropiedadTitularidad"("propietarioId");

-- CreateIndex
CREATE INDEX "TarifaCuota_vigenteDesde_idx" ON "TarifaCuota"("vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoCobro_codigo_key" ON "ConceptoCobro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Emision_conceptoCobroId_periodo_key" ON "Emision"("conceptoCobroId", "periodo");

-- CreateIndex
CREATE INDEX "Cargo_unidadId_estado_fechaVencimiento_idx" ON "Cargo"("unidadId", "estado", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "Pago_propietarioId_estado_fechaPago_idx" ON "Pago"("propietarioId", "estado", "fechaPago");

-- CreateIndex
CREATE INDEX "AplicacionPago_cargoId_idx" ON "AplicacionPago"("cargoId");

-- CreateIndex
CREATE INDEX "AplicacionPago_pagoId_idx" ON "AplicacionPago"("pagoId");

-- CreateIndex
CREATE UNIQUE INDEX "ReciboCaja_numero_key" ON "ReciboCaja"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ReciboCaja_pagoId_key" ON "ReciboCaja"("pagoId");

-- CreateIndex
CREATE UNIQUE INDEX "ReciboCaja_ingresoVarioId_key" ON "ReciboCaja"("ingresoVarioId");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoFavor_propietarioId_key" ON "SaldoFavor"("propietarioId");

-- CreateIndex
CREATE INDEX "ServicioUnidad_unidadId_idx" ON "ServicioUnidad"("unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "Proveedor"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "PartidaPresupuesto_codigo_key" ON "PartidaPresupuesto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Planilla_periodo_key" ON "Planilla"("periodo");

-- CreateIndex
CREATE INDEX "Egreso_fechaPago_idx" ON "Egreso"("fechaPago");

-- CreateIndex
CREATE UNIQUE INDEX "Archivo_storageKey_key" ON "Archivo"("storageKey");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_clave_key" ON "Configuracion"("clave");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_estado_idx" ON "Notificacion"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "Comunicado_publicadoAt_idx" ON "Comunicado"("publicadoAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComunicadoLectura_comunicadoId_usuarioId_key" ON "ComunicadoLectura"("comunicadoId", "usuarioId");

-- CreateIndex
CREATE INDEX "Reserva_areaId_fecha_idx" ON "Reserva"("areaId", "fecha");

-- CreateIndex
CREATE INDEX "Reserva_unidadId_idx" ON "Reserva"("unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Incidencia_codigo_key" ON "Incidencia"("codigo");

-- CreateIndex
CREATE INDEX "Incidencia_estado_idx" ON "Incidencia"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Infraccion_codigo_key" ON "Infraccion"("codigo");

-- CreateIndex
CREATE INDEX "Multa_unidadId_idx" ON "Multa"("unidadId");

-- CreateIndex
CREATE INDEX "Visita_unidadId_idx" ON "Visita"("unidadId");

-- CreateIndex
CREATE INDEX "Visita_ingresoAt_idx" ON "Visita"("ingresoAt");

-- CreateIndex
CREATE INDEX "AutorizacionPermanente_unidadId_idx" ON "AutorizacionPermanente"("unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoAnual_anio_key" ON "PresupuestoAnual"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoPartida_presupuestoId_partidaId_key" ON "PresupuestoPartida"("presupuestoId", "partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Voto_votacionId_unidadId_key" ON "Voto"("votacionId", "unidadId");

-- CreateIndex
CREATE INDEX "Documento_carpeta_idx" ON "Documento"("carpeta");

-- CreateIndex
CREATE INDEX "Medidor_unidadId_idx" ON "Medidor"("unidadId");

-- CreateIndex
CREATE INDEX "LecturaMedidor_medidorId_periodo_idx" ON "LecturaMedidor"("medidorId", "periodo");

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_unidadPrincipalId_fkey" FOREIGN KEY ("unidadPrincipalId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropiedadTitularidad" ADD CONSTRAINT "PropiedadTitularidad_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropiedadTitularidad" ADD CONSTRAINT "PropiedadTitularidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaCuota" ADD CONSTRAINT "TarifaCuota_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emision" ADD CONSTRAINT "Emision_conceptoCobroId_fkey" FOREIGN KEY ("conceptoCobroId") REFERENCES "ConceptoCobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_conceptoCobroId_fkey" FOREIGN KEY ("conceptoCobroId") REFERENCES "ConceptoCobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_emisionId_fkey" FOREIGN KEY ("emisionId") REFERENCES "Emision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_cargoOrigenId_fkey" FOREIGN KEY ("cargoOrigenId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboCaja" ADD CONSTRAINT "ReciboCaja_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboCaja" ADD CONSTRAINT "ReciboCaja_ingresoVarioId_fkey" FOREIGN KEY ("ingresoVarioId") REFERENCES "IngresoVario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoFavor" ADD CONSTRAINT "SaldoFavor_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoFavorMovimiento" ADD CONSTRAINT "SaldoFavorMovimiento_saldoFavorId_fkey" FOREIGN KEY ("saldoFavorId") REFERENCES "SaldoFavor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngresoVario" ADD CONSTRAINT "IngresoVario_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngresoVario" ADD CONSTRAINT "IngresoVario_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioUnidad" ADD CONSTRAINT "ServicioUnidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTercero" ADD CONSTRAINT "ServicioTercero_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTercero" ADD CONSTRAINT "ServicioTercero_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "PartidaPresupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaDetalle" ADD CONSTRAINT "PlanillaDetalle_planillaId_fkey" FOREIGN KEY ("planillaId") REFERENCES "Planilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanillaDetalle" ADD CONSTRAINT "PlanillaDetalle_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adelanto" ADD CONSTRAINT "Adelanto_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Egreso" ADD CONSTRAINT "Egreso_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "PartidaPresupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunicadoLectura" ADD CONSTRAINT "ComunicadoLectura_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaComun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenciaEvento" ADD CONSTRAINT "IncidenciaEvento_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_infraccionId_fkey" FOREIGN KEY ("infraccionId") REFERENCES "Infraccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionPermanente" ADD CONSTRAINT "AutorizacionPermanente_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoPartida" ADD CONSTRAINT "PresupuestoPartida_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoAnual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoPartida" ADD CONSTRAINT "PresupuestoPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "PartidaPresupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_votacionId_fkey" FOREIGN KEY ("votacionId") REFERENCES "Votacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medidor" ADD CONSTRAINT "Medidor_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaMedidor" ADD CONSTRAINT "LecturaMedidor_medidorId_fkey" FOREIGN KEY ("medidorId") REFERENCES "Medidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaMedidor" ADD CONSTRAINT "LecturaMedidor_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

