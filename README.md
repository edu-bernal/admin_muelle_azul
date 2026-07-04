# 🌊 Muelle Azul — Sistema de Administración de Condominio

Plataforma web para la administración integral del condominio de playa **Muelle Azul** (Perú): propietarios, propiedades, cuotas y pagos, estados de cuenta, morosidad, proveedores, servicios de terceros y planillas de personal — con panel de **administración** y **portal del propietario** con distintos niveles de acceso.

> Estado: **Fases 1, 2 y 3 implementadas** (núcleo financiero, operación diaria y optimización). El diseño completo está en [`docs/`](docs).

🎨 **Demo visual (GitHub Pages):** https://edu-bernal.github.io/admin_muelle_azul/ — pantallas de la app con datos ficticios, sin backend. Es solo una vista previa; la app real necesita servidor + base de datos (ver [Despliegue](#despliegue)).

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** |
| Estilos | **Tailwind CSS v4** |
| Base de datos | **PostgreSQL 16** + **Prisma ORM** |
| Autenticación | Propia — JWT firmado con **jose** en cookie `httpOnly` + **bcryptjs**, flujo de invitación/activación |
| Autorización | **RBAC** por rol y permiso, verificado en el backend (un propietario nunca ve datos de otro) |
| Validación | **Zod** |
| Montos | `Decimal(12,2)` en BD y `Prisma.Decimal` en código (nunca `float`) |

Arquitectura de monolito modular: la lógica de negocio vive en `src/modules/` (independiente de la UI), la UI en `src/app/`, y la infraestructura en `src/lib/`.

## Funcionalidades implementadas (MVP)

- **Autenticación y roles** — login, sesión JWT, RBAC con 6 roles (Super Admin, Admin, Contador, Garita, Propietario, Inquilino).
- **Propietarios** — padrón con contactos, documento y canal de envío preferido.
- **Propiedades** — unidades por sector/manzana/lote, tipo casa/terreno, responsable de pago.
- **Cuotas** — emisión masiva con previsualización + emisión individual, tarifa histórica por año.
- **Pagos** — registro por el admin con **aplicación FIFO** automática (pagos parciales y saldo a favor), declaración de pago por el propietario y **bandeja de validación**, recibos de caja con correlativo.
- **Estados de cuenta** — consolidados por propietario, para el admin y en el portal.
- **Morosidad** — reporte por antigüedad de deuda (corriente / 1-30 / 31-60 / 61-90 / 90+).
- **Proveedores** y **Planillas** — maestros base.
- **Auditoría** — toda operación financiera queda registrada en `audit_log`.
- **Portal del propietario** — su estado de cuenta, declaración de pagos, comunicados, reservas e incidencias.

### Fase 2 — Operación diaria

- **Comunicados** — avisos con audiencia por sector, visibles en el portal.
- **Reservas de áreas comunes** — piscina, parrillas, salón y cancha, con aprobación y cobro de tarifa (genera cargo).
- **Incidencias** — tickets de mantenimiento con flujo de estados e historial.
- **Multas** — catálogo de infracciones; al confirmarse se cargan al estado de cuenta de la unidad.

### Fase 3 — Optimización

- **Control de acceso / Garita** — registro de visitas (ingreso/salida), pre-autorización desde el portal, padrón vehicular; rol Garita con vista dedicada.
- **Presupuesto anual** — ejecución presupuestal (presupuestado vs. real por partida) y simulador de cuota.
- **Votaciones** — consultas a la asamblea con voto ponderado (por unidad o alícuota); el propietario vota desde su portal.
- **Documentos** — repositorio con visibilidad por rol.
- **Pagos en línea** — pasarela en modo sandbox (estructura lista para Culqi/MercadoPago/Niubiz vía webhook).
- **Conciliación bancaria** — cruce del extracto (CSV) con los pagos por validar.
- **Planilla avanzada** — generación de planilla con descuento de pensión y adelantos, y registro del pago como egreso.
- **Dashboard ampliado** — egresos, incidencias abiertas, reservas por aprobar y votaciones.

## Puesta en marcha (local)

**Requisitos:** Node.js 20+ y PostgreSQL (o Docker).

```bash
# 1. Instalar dependencias (genera el cliente Prisma automáticamente)
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    edita AUTH_SECRET (openssl rand -base64 32) si lo deseas

# 3. Levantar PostgreSQL (opción A: Docker)
docker compose up -d
#    (opción B: usa tu propio Postgres o Neon y ajusta DATABASE_URL en .env)

# 4. Crear el esquema y sembrar datos
npm run db:migrate       # aplica las migraciones
npm run db:seed          # roles, sectores, tarifas, conceptos, super admin y datos demo

# 5. Arrancar
npm run dev              # http://localhost:3000
```

**Credenciales iniciales** (definidas en `.env`):
`admin@muelleazul.pe` / `Admin1234!` (rol Super Admin).

### Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `start` | Build y arranque de producción |
| `npm run db:migrate` | Aplica migraciones Prisma |
| `npm run db:seed` | Siembra datos de referencia y demo |
| `npm run db:studio` | Prisma Studio (explorador de datos) |

## Estructura

```
src/
  app/              # Rutas (App Router)
    login/          # autenticación
    (admin)/        # panel de administración (dashboard, propietarios, unidades, finanzas…)
    (portal)/       # portal del propietario
  modules/          # LÓGICA DE NEGOCIO
    finanzas/       # emisión, pagos (FIFO), estado de cuenta, morosidad
  lib/              # prisma, sesión, rbac, auditoría, dinero
  components/       # UI reutilizable
prisma/
  schema.prisma     # modelo de datos completo
  migrations/       # migraciones SQL
  seed.ts           # datos iniciales
docs/               # diseño funcional, técnico, modelo de datos, roadmap, migración
Tablas/             # Excel operativos reales (fuente de la migración de datos)
```

## Documentación de diseño

| Documento | Contenido |
|---|---|
| [00 — Plan Maestro](docs/00-PLAN-MAESTRO.md) | Visión, alcance, fases, cronograma y riesgos |
| [01 — Diseño Funcional](docs/01-DISENO-FUNCIONAL.md) | Módulos, roles, casos de uso y reglas de negocio |
| [02 — Diseño Técnico](docs/02-DISENO-TECNICO.md) | Arquitectura, seguridad, API y despliegue |
| [03 — Modelo de Datos](docs/03-MODELO-DE-DATOS.md) | Entidades, relaciones y diccionario de datos |
| [04 — Roadmap](docs/04-ROADMAP-IMPLEMENTACION.md) | Sprints, backlog priorizado y criterios de aceptación |
| [05 — Migración de Datos](docs/05-MIGRACION-DATOS.md) | Análisis de los Excel reales y plan de carga |

## Despliegue

- **App real (funcional):** requiere un servidor Node + PostgreSQL. Recomendado **Vercel** (app) + **Neon/Supabase** (base de datos). Configura `DATABASE_URL` y `AUTH_SECRET`, ejecuta `prisma migrate deploy` y `db:seed`. *No se puede desplegar en GitHub Pages* porque Pages solo sirve archivos estáticos (sin servidor ni base de datos).
- **Demo visual:** el contenido de `web-demo/` se publica automáticamente en **GitHub Pages** mediante el workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## Pendientes / mejoras

- Conectar una pasarela de pago real (Culqi/MercadoPago) reemplazando el sandbox por el webhook de confirmación.
- UI de lecturas de medidores (el modelo de datos ya existe) y mantenimiento preventivo programado.
- Almacenamiento real de archivos (S3/R2) para vouchers, documentos y evidencias.
- Carga del padrón real desde `Tablas/` según [docs/05](docs/05-MIGRACION-DATOS.md).

Ver el [roadmap](docs/04-ROADMAP-IMPLEMENTACION.md) para el detalle.

## Licencia

MIT — ver [LICENSE](LICENSE).
