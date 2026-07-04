# Roadmap de Implementación — Condominio Muelle Azul

**Versión:** 1.0 · **Fecha:** 04/07/2026 · Sprints de 2 semanas. IDs de funcionalidades según el [Diseño Funcional](01-DISENO-FUNCIONAL.md).

---

## Fase 0 — Preparación (Sprint 0, 2 semanas)

**Objetivo:** proyecto listo para desarrollar y desplegar continuo.

- [ ] Repositorio Git + estructura del proyecto (Next.js + TS + Tailwind + shadcn/ui + Prisma).
- [ ] Docker Compose local: PostgreSQL, MinIO (S3 local), Mailpit (correo local).
- [ ] `schema.prisma` completo del núcleo (secciones 2–4 y 6 del modelo de datos) + migración inicial + seed (roles, permisos, conceptos, partidas, super admin).
- [ ] CI en GitHub Actions: lint, typecheck, tests; deploy automático a staging (Vercel + Neon + R2).
- [ ] Módulo `shared`: money utils, audit, mailer, storage de archivos, generador PDF base con logo.
- [ ] Validar con la administración los hallazgos y preguntas abiertas del [análisis de datos reales](05-MIGRACION-DATOS.md) (tarifas por año, campaña Ponte al Día, tarifa de vigilancia).
- [ ] Wireframes de las 8 pantallas núcleo (login, dashboard admin, padrón, ficha unidad, emisión, registro de pago, estado de cuenta, home propietario).

**Criterio de salida:** app "hola mundo" con login desplegada en staging; esquema migrado; seed corriendo.

---

## Fase 1 — MVP financiero (Sprints 1–4, 8 semanas)

### Sprint 1 — Identidad y padrón
- [ ] Autenticación completa: login, activación por invitación, recuperación de contraseña, sesiones (FP-04).
- [ ] RBAC operativo (middleware + helper `can()` en servicios) + suite de tests de scoping.
- [ ] CRUD Propietarios (FP-01) y Unidades (FU-01), con agrupación de unidades (FU-02).
- [ ] Titularidad propietario↔unidad con histórico y responsable de pago (FP-02, RN-P1..P4).
- [ ] Layouts: panel admin y portal propietario (navegación por rol).

### Sprint 2 — Motor de cargos y pagos
- [ ] Conceptos de cobro + configuración de base de cálculo (FU-04, sección 5.2 técnico).
- [ ] **Emisión masiva con previsualización** (FC-01) idempotente + emisión individual (FC-02).
- [ ] Registro de pago por admin con voucher (FC-03).
- [ ] Recibo de caja PDF con correlativo global y reimpresión controlada (FC-12) + ingresos varios (FC-13).
- [ ] Aplicación FIFO con pagos parciales y saldo a favor (FC-05) — transaccional, con tests de concurrencia.
- [ ] Anulaciones auditadas de cargos y pagos (FC-09) + `audit_log` en todas las mutaciones financieras.

### Sprint 3 — Portal del propietario y estados de cuenta
- [ ] Home propietario: saldo, próximo vencimiento (dashboard propietario §16).
- [ ] **Declaración de pago por propietario** + bandeja de validación del admin (FC-04) + notificaciones por correo.
- [ ] Estado de cuenta consolidado y por unidad, en pantalla + **PDF** + Excel (FE-01).
- [ ] Envío mensual automático del EECC por correo (FE-02) — job.
- [ ] Constancia de no adeudo (FC-10).

### Sprint 4 — Egresos y cierre del MVP
- [ ] Proveedores: maestro + facturas + pagos (FV-01..FV-04).
- [ ] Servicios de terceros: contratos, obligaciones recurrentes generadas por job, alertas de vencimiento, pagos (FS-01..FS-05).
- [ ] Planilla básica: trabajadores, planilla mensual, adelantos, registro de pago (FN-01..FN-05).
- [ ] Reportes F1: recaudación, **morosidad por antigüedad** (FC-07), egresos por categoría, flujo de caja (FE-03).
- [ ] Recordatorios de vencimiento y mora automática parametrizable (FC-06, FC-08) — jobs.
- [ ] **Migración de datos reales** según [05-MIGRACION-DATOS](05-MIGRACION-DATOS.md): padrón (424 lotes, 4 sectores), cargos históricos desde Abr 2021 con tarifas por año, pagos históricos y 2026 detallado, egresos, vigilancia + reporte de cuadre contra "Saldo por Pagar".
- [ ] Hardening: rate limiting, revisión de scoping, backups verificados.

**Criterio de salida (go-live piloto):** los 6 criterios de éxito del MVP del Plan Maestro cumplidos; piloto de 2 semanas con datos reales.

---

## Fase 2 — Operación diaria (Sprints 5–7, 6 semanas)

### Sprint 5 — Comunicación y transparencia
- [ ] Comunicados con audiencias y confirmación de lectura (FM-01, FM-02) + preferencias de notificación (FM-04).
- [ ] Documentos del condominio con visibilidad por rol (FD-01, FD-02).
- [ ] Rendición mensual a propietarios (FE-04).
- [ ] Dashboard admin con KPIs (§16) sobre las vistas `v_*`.

### Sprint 6 — Reservas y accesos
- [ ] Áreas comunes configurables + calendario de reservas con reglas y anti-solape (FR-01..FR-05).
- [ ] Cargo automático por tarifa de reserva y bloqueo por morosidad (FR-03, FR-04).
- [ ] Vista garita (tablet): registro rápido de visitas E/S (FA-02, RN-A1).
- [ ] Pre-autorización de visitas por el propietario + autorizaciones permanentes (FA-01, FA-03).
- [ ] Inquilinos temporales y padrón vehicular (FA-04, FA-05, FP-06).

### Sprint 7 — Incidencias, multas y presupuesto
- [ ] Tickets de incidencias con flujo completo y fotos (FI-01, FI-02) + vínculo a gasto (FI-03).
- [ ] Multas: catálogo, descargo y conversión a cargo (FT-01..FT-03).
- [ ] Vigilancia de propiedad: suscripciones por unidad + cargo mensual automático + reporte de propiedades vigiladas (FO-01..FO-04).
- [ ] Campañas de regularización tipo "Ponte al Día" (FC-14).
- [ ] Presupuesto anual + ejecución vs. real + simulador de cuota (FB-01..FB-03).
- [ ] Reportes F2 restantes y encuesta de satisfacción del piloto.

---

## Fase 3 — Optimización (Sprints 8–10, 4–6 semanas)

### Sprint 8 — Pagos en línea
- [ ] Integración pasarela (evaluar Culqi vs. MercadoPago vs. Niubiz por comisiones) — checkout desde el portal, webhook de confirmación → aplicación automática (FC-11).
- [ ] Conciliación bancaria asistida: carga de extracto CSV/Excel + matching sugerido (FC-11).

### Sprint 9 — Participación y medidores
- [ ] Votaciones ponderadas con acta (FV2-01).
- [ ] Lecturas de medidores individuales de agua → cargo por consumo (§3.2 plan).
- [ ] Mantenimiento preventivo programado con checklists (FI-04).

### Sprint 10 — Planilla avanzada y pulido
- [ ] Cálculo asistido AFP/ONP/EsSalud parametrizable + boletas PDF (FN-06, FN-08).
- [ ] Control de asistencia del personal (FN-07).
- [ ] Auditoría de rendimiento y accesibilidad; deuda técnica; documentación de operación (runbook).

---

## Backlog priorizado (resumen MoSCoW)

| Prioridad | Funcionalidades |
|---|---|
| **Must (F1)** | Auth+RBAC, propietarios, unidades, emisión de cuotas, pagos y validación, EECC PDF, morosidad, proveedores, servicios, planilla básica, recordatorios/mora, migración inicial |
| **Should (F2)** | Comunicados, documentos, dashboard, reservas, garita/visitas, incidencias, multas, presupuesto, rendición mensual |
| **Could (F3)** | Pasarela de pagos, conciliación asistida, votaciones, medidores, preventivo, planilla avanzada |
| **Won't (v1)** | Facturación electrónica SUNAT, app nativa, integración bancaria directa, hardware de acceso, multi-condominio |

## Definición de Hecho (DoD) por historia

1. Código con tests (unitarios; integración si toca dinero o scoping) en verde en CI.
2. Validación Zod en el borde + permisos verificados en servicio (no solo UI).
3. Mutaciones financieras auditadas en `audit_log`.
4. UI responsive verificada en móvil.
5. Revisado en staging por el Product Owner.

## Próximos pasos inmediatos

1. **Validar este diseño con la administración de Muelle Azul**: confirmar áreas comunes, conceptos y montos de cuota, reglas de mora, catálogo de infracciones y datos disponibles para la migración.
2. Decidir hosting (recomendado: Vercel + Neon + R2) y registrar dominio/correo del condominio.
3. Ejecutar Fase 0 (Sprint 0).
