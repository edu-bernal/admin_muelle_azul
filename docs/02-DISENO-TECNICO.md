# Diseño Técnico — Condominio Muelle Azul

**Versión:** 1.0 · **Fecha:** 04/07/2026

---

## 1. Decisiones de arquitectura

| Decisión | Elección | Justificación |
|---|---|---|
| Tipo de aplicación | **Web app full-stack monolítica modular + PWA** | Un solo despliegue, menor costo operativo; PWA cubre el uso móvil (propietarios y garita) sin app nativa |
| Framework | **Next.js 15+ (App Router) con TypeScript** | Front y back en un solo proyecto; SSR para rendimiento en móvil; ecosistema maduro; un solo lenguaje |
| Base de datos | **PostgreSQL 16** | Integridad transaccional (crítico en dinero), tipos `numeric` para montos, row-level locking, madurez |
| ORM | **Prisma** | Migraciones versionadas, tipado end-to-end, productividad |
| Autenticación | **Auth.js (NextAuth v5)** con credenciales + verificación de correo; 2FA opcional para roles administrativos | Control total del flujo de invitación/activación |
| Autorización | **RBAC propio** (tabla de roles/permisos) aplicado en la capa de servicios, no solo en UI | La regla "un propietario no ve datos de otro" debe vivir en el backend |
| Almacenamiento de archivos | **S3-compatible** (Cloudflare R2 o AWS S3) con URLs firmadas | Vouchers, facturas, contratos, fotos de incidencias; nunca en el filesystem del servidor |
| Correo transaccional | **Resend** (o Amazon SES) | Estados de cuenta, notificaciones, invitaciones |
| PDF | **@react-pdf/renderer** o Puppeteer serverless | Estados de cuenta, constancias, boletas |
| Jobs programados | **Cron del hosting o pg_boss** (cola sobre PostgreSQL) | Recordatorios, mora automática, envío mensual de estados de cuenta — sin infra extra (no Redis en v1) |
| UI | **Tailwind CSS + shadcn/ui** | Velocidad de desarrollo, accesibilidad, consistencia |
| Validación | **Zod** compartido entre cliente y servidor | Una sola definición de esquemas |
| Hosting | **Vercel** (app) + **Neon/Supabase** (PostgreSQL) + **R2** (archivos) — alternativa: VPS único con Docker Compose | Costo bajo (~USD 20–50/mes), backups gestionados |
| Monitoreo | Sentry (errores) + logs estructurados | Diagnóstico en producción |

**Por qué monolito modular y no microservicios:** un condominio (aun con 1,000 unidades) tiene carga baja; el costo de operar microservicios no se justifica. La modularidad se logra por límites de módulo en el código (`modules/finanzas`, `modules/propiedades`, ...), lo que permite extraer servicios en el futuro si se convierte en producto multi-condominio.

## 2. Diagrama de arquitectura

```
┌───────────────────────────────────────────────────────────────┐
│                        CLIENTES (PWA)                         │
│  Admin (desktop)   Propietario (móvil)   Garita (tablet)      │
└──────────────┬────────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼────────────────────────────────────────────────┐
│                     NEXT.JS (Vercel)                          │
│  ┌─────────────┐  ┌──────────────────────────────────────┐    │
│  │  UI (RSC +  │  │        API / Server Actions          │    │
│  │  shadcn/ui) │  │  ┌────────────────────────────────┐  │    │
│  └─────────────┘  │  │ Capa de servicios por módulo   │  │    │
│                   │  │ auth │ propietarios │ unidades │  │    │
│                   │  │ finanzas │ planillas │ provee. │  │    │
│                   │  │ reservas │ accesos │ incidenc. │  │    │
│                   │  └───────────┬────────────────────┘  │    │
│                   │   Middleware: AuthN + RBAC + Audit   │    │
│                   └──────────────┼───────────────────────┘    │
└──────────────────────────────────┼────────────────────────────┘
          ┌───────────────┬────────┼──────────┬───────────────┐
          ▼               ▼        ▼          ▼               ▼
   ┌────────────┐  ┌───────────┐ ┌──────┐ ┌─────────┐ ┌────────────┐
   │ PostgreSQL │  │ R2 / S3   │ │Resend│ │ pg_boss │ │  Sentry    │
   │ (Neon)     │  │ (archivos)│ │(mail)│ │ (jobs)  │ │ (errores)  │
   └────────────┘  └───────────┘ └──────┘ └─────────┘ └────────────┘
                                              │
                                    Jobs: mora automática,
                                    recordatorios, envío EECC,
                                    obligaciones recurrentes
```

## 3. Estructura del proyecto

```
/src
  /app                      # Next.js App Router
    /(auth)                 # login, activación, recuperación
    /(admin)                # layout + rutas del panel administrativo
      /dashboard
      /propietarios
      /propiedades
      /finanzas             # cuotas, pagos, estados de cuenta
      /proveedores
      /servicios
      /planillas
      /reservas /accesos /incidencias /comunicados ...
    /(portal)               # layout + rutas del portal propietario
      /mi-cuenta /mis-pagos /mis-reservas /mis-visitas ...
    /(garita)               # vista simplificada para vigilancia
    /api                    # route handlers (webhooks, descargas)
  /modules                  # LÓGICA DE NEGOCIO (independiente de la UI)
    /auth        service.ts  rbac.ts
    /propietarios
    /propiedades
    /finanzas    cargos.service.ts  pagos.service.ts  aplicacion.service.ts
                 mora.service.ts  estado-cuenta.service.ts
    /planillas /proveedores /servicios /reservas /accesos
    /incidencias /comunicados /multas /presupuesto /documentos
    /shared      audit.ts  files.ts  mailer.ts  pdf/  money.ts
  /lib                      # prisma client, auth config, utils
  /jobs                     # tareas programadas
/prisma
  schema.prisma
  /migrations
  seed.ts
/tests
  /unit /integration /e2e
```

**Regla de dependencias:** `app` (UI) → `modules` (negocio) → `lib` (infraestructura). La UI nunca toca Prisma directamente; todo pasa por servicios, donde se aplican RBAC, validación Zod y auditoría.

## 4. Seguridad

### 4.1 Autenticación
- Credenciales (email + contraseña con Argon2id) y flujo de **invitación**: el admin crea el propietario → el sistema envía enlace de activación con token de un solo uso (expira 72 h).
- Sesiones JWT con rotación; expiración 30 días propietarios, 8 h roles administrativos.
- 2FA TOTP opcional, recomendado para Admin/Contador.
- Rate limiting en login y recuperación de contraseña.

### 4.2 Autorización (RBAC + alcance de datos)
Dos niveles, ambos en el backend:
1. **Permiso funcional**: `finanzas.pagos.crear`, `reservas.aprobar`, etc. Roles = conjuntos de permisos (sembrados por seed, editables por Super Admin).
2. **Alcance de datos (scoping)**: todo servicio que devuelve datos de propietario recibe el `sessionUser` y filtra:
   - Rol Propietario → `WHERE propietario_id IN (unidades del usuario)`. El `propietarioId` **jamás** llega como parámetro del cliente; se deriva de la sesión.
   - Rol Garita → solo entidades del módulo de accesos + lectura del padrón (nombre y unidad, sin datos financieros ni de contacto).

### 4.3 Datos financieros y auditoría
- Montos siempre `numeric(12,2)` en BD y enteros en céntimos (o decimal.js) en código — nunca `float`.
- Cargos y pagos son **inmutables**: correcciones vía anulación + nuevo registro.
- Tabla `audit_log` (append-only): usuario, acción, entidad, id, diff JSON, timestamp, IP. Trigger o middleware de servicio para toda mutación financiera.
- Aplicación de pagos dentro de **transacciones** con bloqueo por unidad (evita doble aplicación concurrente).

### 4.4 Archivos y privacidad
- Subidas validadas (tipo MIME, tamaño ≤ 10 MB) y almacenadas con clave aleatoria; acceso solo por **URL firmada** de corta duración emitida tras verificar permisos.
- Ley 29733: datos personales mínimos, consentimiento en el registro, derecho de rectificación vía admin, política de privacidad publicada.
- Backups cifrados; retención 30 días.

## 5. Diseño de la lógica financiera (núcleo)

### 5.1 Modelo cargo–pago–aplicación

```
CARGO (lo que se debe)          PAGO (lo que se recibió)
├ unidad, concepto, período     ├ propietario, fecha, monto,
├ monto, vencimiento            │ medio, nro_operacion, voucher
├ estado: PENDIENTE|PARCIAL|    ├ estado: POR_VALIDAR|CONFIRMADO|
│        PAGADO|ANULADO         │        RECHAZADO|ANULADO
└──────────┐                    └──────────┐
           ▼                               ▼
        APLICACION_PAGO (n:m) — monto_aplicado
        Σ aplicaciones de un pago ≤ monto del pago
        Σ aplicaciones a un cargo ≤ monto del cargo
        Excedente del pago → saldo a favor del propietario
```

- **Emisión masiva**: job transaccional que crea un `cargo` por unidad activa según su base de cálculo; idempotente por (`unidad`, `concepto`, `período`) — reejecución no duplica.
- **Confirmación de pago**: transacción que (1) marca pago `CONFIRMADO`, (2) aplica FIFO sobre cargos `PENDIENTE|PARCIAL` ordenados por vencimiento, (3) actualiza estados de cargos, (4) registra excedente como saldo a favor, (5) escribe auditoría, (6) encola notificación.
- **Mora**: job diario que, para cargos vencidos fuera del período de gracia, genera cargos de interés según configuración (una vez por período). Parametrizable y desactivable.
- **Estado de cuenta**: vista materializada o consulta agregada por propietario: `saldo = Σ cargos vigentes − Σ aplicaciones confirmadas − saldo a favor`.

### 5.2 Configuración parametrizable (tabla `configuracion`)
- Base de cálculo de cuota (alícuota | fijo | m²) y valores por período.
- Mora: tipo (% | fijo), tasa, días de gracia, auto/manual.
- Días de recordatorio pre/post vencimiento.
- Reglas de reserva (bloqueo por morosidad, máximos por unidad).
- Medios de pago habilitados y cuentas bancarias del condominio (mostradas al propietario al declarar pago).

## 6. API y contratos

- **Server Actions** para mutaciones desde la propia app (patrón principal) + **route handlers REST** para: descargas de PDF, webhooks de pasarela (F3), y futura app móvil.
- Convención REST (para los handlers): `GET/POST /api/v1/{recurso}`, respuestas `{ data, error }`, paginación por cursor, errores tipados (`VALIDATION_ERROR`, `FORBIDDEN`, `CONFLICT`...).
- Todos los inputs validados con Zod en el borde del servicio (no en la UI).

Ejemplos de contratos clave:

```
POST /api/v1/finanzas/emisiones          # emisión masiva {concepto, periodo, vencimiento, preview: bool}
POST /api/v1/finanzas/pagos              # registrar pago (admin) o declarar (propietario)
POST /api/v1/finanzas/pagos/:id/confirmar
POST /api/v1/finanzas/pagos/:id/rechazar {motivo}
GET  /api/v1/finanzas/estado-cuenta?propietarioId=&desde=&hasta=   # scoped por rol
GET  /api/v1/reportes/morosidad?corte=YYYY-MM-DD
POST /api/v1/reservas                    # valida reglas + disponibilidad en transacción
POST /api/v1/accesos/ingresos            # garita: registro rápido
```

## 7. Rendimiento y datos

- Índices: `cargo(unidad_id, estado, vencimiento)`, `pago(propietario_id, estado, fecha)`, `aplicacion(cargo_id)`, `aplicacion(pago_id)`, únicos para idempotencia de emisión.
- Emisión masiva y envío de correos en lotes vía job (no en el request).
- Reportes pesados (morosidad histórica, flujo de caja anual) con consultas agregadas SQL directas (Prisma `$queryRaw` tipado), no N+1.
- Volumen esperado (300 unidades × 12 cuotas × 10 años ≈ 36k cargos + pagos): trivial para PostgreSQL; no se requiere particionado.

## 8. Estrategia de pruebas

| Nivel | Alcance | Herramienta |
|---|---|---|
| Unitarias | Lógica financiera pura: aplicación FIFO, cálculo de mora, prorrateo por alícuota, saldos | Vitest — **cobertura ≥ 90% en `modules/finanzas`** |
| Integración | Servicios contra PostgreSQL real (testcontainers): emisión idempotente, concurrencia de pagos, RBAC/scoping | Vitest + Testcontainers |
| E2E | Flujos críticos: login propietario → declarar pago → admin confirma → estado de cuenta actualizado; emisión masiva; reserva | Playwright |
| Seguridad | Tests de scoping: propietario A intenta acceder a datos de B → 403 en todos los endpoints | Suite dedicada |

## 9. CI/CD y entornos

- **Entornos**: `dev` (local, Docker Compose con PostgreSQL + MinIO + Mailpit) → `staging` (datos de prueba) → `producción`.
- **CI (GitHub Actions)**: lint + typecheck + tests unitarios/integración en cada PR; E2E en staging; migraciones Prisma aplicadas automáticamente en deploy con revisión previa.
- **Feature flags** simples (tabla config) para activar módulos de F2/F3 sin re-deploy.
- Semillas (`seed.ts`): roles/permisos, catálogos (conceptos de cobro, categorías de incidencia, partidas), usuario Super Admin inicial.

## 10. Operación

- **Backups**: automáticos diarios (Neon PITR / pg_dump programado) + réplica de archivos R2; prueba de restauración trimestral documentada.
- **Observabilidad**: Sentry para errores; log estructurado JSON con `requestId` y `userId`; alerta si un job programado falla (mora, recordatorios, EECC).
- **Runbook**: procedimientos para reemisión de cuotas, reversa de pagos mal aplicados, restauración de backup y rotación de credenciales.
