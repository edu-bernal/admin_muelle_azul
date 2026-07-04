# Despliegue en Vercel + Supabase

Guía paso a paso para poner el sistema en producción. El repositorio ya está
preparado: las migraciones se aplican solas durante el build de Vercel (script
`vercel-build`), y Prisma usa el pooler de Supabase para la app y la conexión
directa para las migraciones (`directUrl`).

**Tiempo estimado: ~15 minutos.**

---

## 1. Base de datos en Supabase

1. En [supabase.com](https://supabase.com) → **New project**. Elige un nombre,
   una **contraseña de base de datos** (guárdala) y la región más cercana (ej.
   *East US*). Espera a que termine de aprovisionar (~2 min).
2. Ve a **Project Settings → Database → Connection string**. Necesitas **dos**
   cadenas (el botón "View parameters" muestra host, usuario y puerto):
   - **DATABASE_URL** → pestaña **Connection pooling**, modo **Transaction**
     (puerto **6543**). Agrégale al final `&pgbouncer=true` si no lo trae.
   - **DIRECT_URL** → **Direct connection** (puerto **5432**).
   - En ambas, reemplaza `[YOUR-PASSWORD]` por la contraseña del paso 1.

Ejemplo:
```
DATABASE_URL=postgresql://postgres.abcd:TUPASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.abcd:TUPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## 2. Desplegar en Vercel

1. En [vercel.com](https://vercel.com) → **Add New… → Project** → **Import Git
   Repository** → elige `edu-bernal/admin_muelle_azul`.
2. Framework: Vercel detecta **Next.js** automáticamente. No cambies el build
   command (usará `vercel-build`, que ya incluye las migraciones).
3. En **Environment Variables**, agrega estas 4 (todas en *Production*):

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la cadena del pooler (puerto 6543) del paso 1 |
   | `DIRECT_URL` | la cadena directa (puerto 5432) del paso 1 |
   | `AUTH_SECRET` | un secreto aleatorio (ver abajo) |
   | `APP_URL` | `https://TU-PROYECTO.vercel.app` (puedes ajustarlo tras el primer deploy) |

   Genera el `AUTH_SECRET` con: `openssl rand -base64 32`
   (o usa el valor sugerido que te dejé; conviene generar el tuyo).

4. **Deploy**. En el build, Vercel ejecutará `prisma migrate deploy` y creará
   todas las tablas en Supabase automáticamente.

## 3. Sembrar los datos iniciales (una sola vez)

El build crea el **esquema**, pero los datos base (roles, sectores, tarifas y el
**usuario Super Admin**) los carga el seed. Ejecútalo una vez desde tu máquina
apuntando a Supabase:

```bash
# en la raíz del proyecto, con el repo clonado y dependencias instaladas (npm install)
# crea un archivo .env con las MISMAS variables que pusiste en Vercel:
#   DATABASE_URL=...(6543)   DIRECT_URL=...(5432)   SEED_ADMIN_EMAIL=...   SEED_ADMIN_PASSWORD=...
npm run db:seed
```

Verás `Seed completado ✔`. (El seed es idempotente: puedes correrlo de nuevo sin
duplicar datos.)

## 4. Entrar

Abre `https://TU-PROYECTO.vercel.app`, e inicia sesión con las credenciales del
seed:

- **Usuario:** `admin@muelleazul.pe` (o el `SEED_ADMIN_EMAIL` que definiste)
- **Contraseña:** `Admin1234!` (o el `SEED_ADMIN_PASSWORD` que definiste)

> Cambia estas credenciales por unas propias antes de usarlo con datos reales.

---

## Notas

- **Redespliegue continuo:** cada `git push` a `main` dispara un nuevo deploy en
  Vercel y aplica migraciones nuevas automáticamente.
- **Nuevas migraciones:** cuando cambie el `schema.prisma`, genera la migración
  en local (`npm run db:migrate`) y haz push; Vercel la aplicará en el deploy.
- **Pooler vs. directa:** la app usa el pooler (6543) para no agotar conexiones
  en serverless; las migraciones usan la directa (5432). Esto ya está resuelto
  en `schema.prisma` (`url` + `directUrl`).
- **Datos reales del padrón:** cárgalos después, según
  [05-MIGRACION-DATOS.md](05-MIGRACION-DATOS.md).
- **Almacenamiento de archivos:** los vouchers/documentos usan referencias en BD;
  para subir archivos reales conecta un bucket S3/R2 (pendiente, ver README).
