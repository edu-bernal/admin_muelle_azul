import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES, PERMISOS } from "../src/lib/rbac";

const prisma = new PrismaClient();
const D = (v: number | string) => new Prisma.Decimal(v);
const mes = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1));

async function seedConfiguracion() {
  const items = [
    { clave: "recibo_inicio", valor: 799, descripcion: "Correlativo inicial de recibos de caja" },
    {
      clave: "mora",
      valor: { tipo: "PORCENTAJE", tasa: 0, diasGracia: 10, automatica: false },
      descripcion: "Configuración de recargos por mora",
    },
    {
      clave: "recordatorios",
      valor: { diasAntes: 5, alVencer: true, diasDespues: [1, 15, 30] },
      descripcion: "Recordatorios de vencimiento",
    },
    {
      clave: "cuentas_bancarias_condominio",
      valor: [{ banco: "BBVA", numero: "0011-XXXX-XXXXXXXXXX", cci: "" }],
      descripcion: "Cuentas para que el propietario deposite",
    },
  ];
  for (const it of items) {
    await prisma.configuracion.upsert({
      where: { clave: it.clave },
      create: { clave: it.clave, valor: it.valor as Prisma.InputJsonValue, descripcion: it.descripcion },
      update: { valor: it.valor as Prisma.InputJsonValue },
    });
  }
}

async function seedCondominio() {
  const existe = await prisma.condominio.findFirst();
  if (!existe) {
    await prisma.condominio.create({
      data: {
        nombre:
          "Asociación de Propietarios del Condominio Residencial de Playa Muelle Azul",
        ruc: "20610523677",
        moneda: "PEN",
      },
    });
  }
}

async function seedSectores() {
  const sectores = [
    { codigo: "MA_C", nombre: "MA Central" },
    { codigo: "MA_A", nombre: "MA Ampliación" },
    { codigo: "MA_O", nombre: "MA Oeste" },
    { codigo: "MA_N", nombre: "MA Norte" },
  ];
  for (const s of sectores) {
    await prisma.sector.upsert({
      where: { codigo: s.codigo },
      create: s,
      update: { nombre: s.nombre },
    });
  }
}

async function seedTarifas() {
  const count = await prisma.tarifaCuota.count();
  if (count === 0) {
    await prisma.tarifaCuota.createMany({
      data: [
        { vigenteDesde: mes(2021, 4), montoMensual: D(100) },
        { vigenteDesde: mes(2025, 1), montoMensual: D(150) },
      ],
    });
  }
}

async function seedConceptos() {
  const conceptos = [
    { codigo: "MANT", nombre: "Cuota de Mantenimiento", esRecurrente: true, generaMora: true },
    { codigo: "EXTRA", nombre: "Cuota Extraordinaria", esRecurrente: false, generaMora: true },
    { codigo: "VIGILANCIA", nombre: "Vigilancia de Propiedad", esRecurrente: true, generaMora: true },
    { codigo: "MORA", nombre: "Interés por Mora", esRecurrente: false, generaMora: false },
    { codigo: "MULTA", nombre: "Multa por Infracción", esRecurrente: false, generaMora: true },
    { codigo: "SALDO_INICIAL", nombre: "Saldo Inicial (migración)", esRecurrente: false, generaMora: true },
    { codigo: "OTRO", nombre: "Otro Cargo", esRecurrente: false, generaMora: false },
  ];
  for (const c of conceptos) {
    await prisma.conceptoCobro.upsert({
      where: { codigo: c.codigo },
      create: c,
      update: { nombre: c.nombre },
    });
  }
}

async function seedPartidas() {
  const partidas = [
    { codigo: "MANT_INTEGRAL", nombre: "Mantenimiento integral" },
    { codigo: "SALVAVIDAS", nombre: "Salvavidas (temporada)" },
    { codigo: "VIGILANCIA", nombre: "Vigilancia" },
    { codigo: "ELECTRICO", nombre: "Eléctrico / luminarias" },
    { codigo: "COMPRAS", nombre: "Compras y materiales" },
    { codigo: "PLANILLA", nombre: "Planilla de personal" },
    { codigo: "ADMIN", nombre: "Administración" },
    { codigo: "FONDO_RESERVA", nombre: "Fondo de reserva" },
  ];
  for (const p of partidas) {
    await prisma.partidaPresupuesto.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { nombre: p.nombre },
    });
  }
}

async function seedRolesPermisos() {
  for (const [codigo, def] of Object.entries(PERMISOS)) {
    await prisma.permiso.upsert({
      where: { codigo },
      create: { codigo, descripcion: def },
      update: { descripcion: def },
    });
  }
  for (const [codigo, def] of Object.entries(ROLES)) {
    const rol = await prisma.rol.upsert({
      where: { codigo },
      create: { codigo, nombre: def.nombre },
      update: { nombre: def.nombre },
    });
    // Vincular permisos concretos (los comodines se resuelven en runtime vía rbac.ts).
    const permisosConcretos = def.permisos.filter((p) => !p.includes("*"));
    for (const permCodigo of permisosConcretos) {
      const permiso = await prisma.permiso.findUnique({ where: { codigo: permCodigo } });
      if (permiso) {
        await prisma.rolPermiso.upsert({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: permiso.id } },
          create: { rolId: rol.id, permisoId: permiso.id },
          update: {},
        });
      }
    }
  }
}

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@muelleazul.pe";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const rol = await prisma.rol.findUnique({ where: { codigo: "SUPER_ADMIN" } });
  if (!rol) throw new Error("Rol SUPER_ADMIN no existe");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.usuario.upsert({
    where: { email },
    create: {
      email,
      nombreCompleto: "Administrador Muelle Azul",
      passwordHash,
      rolId: rol.id,
      estado: "ACTIVO",
    },
    update: { rolId: rol.id, estado: "ACTIVO" },
  });
  console.log(`  Super admin: ${email}`);
}

// ── Datos demo: unidades, propietarios y cuotas de ejemplo ──────────────
async function seedDemo() {
  const sectores = await prisma.sector.findMany();
  const sectorId = (codigo: string) => sectores.find((s) => s.codigo === codigo)!.id;

  // Datos de ejemplo FICTICIOS (el repositorio es público). La carga del padrón
  // real se hace localmente según docs/05-MIGRACION-DATOS.md.
  const demo = [
    { codigo: "MA_C-A_1", sector: "MA_C", mz: "A", lote: "1", tipo: "CASA" as const, prop: "Juan Pérez Demo", email: "propietario1@ejemplo.com" },
    { codigo: "MA_C-A_2", sector: "MA_C", mz: "A", lote: "2", tipo: "CASA" as const, prop: "María López Demo", email: "propietario2@ejemplo.com" },
    { codigo: "MA_C-B_6", sector: "MA_C", mz: "B", lote: "6", tipo: "CASA" as const, prop: "Carlos Ramírez Demo", email: null },
    { codigo: "MA_A-C1_6", sector: "MA_A", mz: "C1", lote: "6", tipo: "CASA" as const, prop: "Ana Torres Demo", email: null },
    { codigo: "MA_O-A2_3", sector: "MA_O", mz: "A2", lote: "3", tipo: "CASA" as const, prop: "Luis Gómez Demo", email: null },
    { codigo: "MA_N-C_4", sector: "MA_N", mz: "C", lote: "4", tipo: "TERRENO" as const, prop: null, email: null },
  ];

  for (const d of demo) {
    const unidad = await prisma.unidad.upsert({
      where: { codigo: d.codigo },
      create: {
        codigo: d.codigo,
        sectorId: sectorId(d.sector),
        manzana: d.mz,
        lote: d.lote,
        tipo: d.tipo,
      },
      update: {},
    });

    if (d.prop) {
      // ¿ya tiene titularidad?
      const yaTiene = await prisma.propiedadTitularidad.findFirst({
        where: { unidadId: unidad.id },
      });
      if (!yaTiene) {
        const propietario = await prisma.propietario.create({
          data: { nombre: d.prop, email: d.email },
        });
        await prisma.propiedadTitularidad.create({
          data: {
            propietarioId: propietario.id,
            unidadId: unidad.id,
            esResponsablePago: true,
            porcentaje: D(100),
          },
        });
      }
    }
  }

  // Cuotas demo: MANT ene-mar 2026 (S/150) para unidades con propietario, si no existen.
  const concepto = await prisma.conceptoCobro.findUnique({ where: { codigo: "MANT" } });
  const unidadesConProp = await prisma.unidad.findMany({
    where: { titularidades: { some: {} } },
  });
  const periodos = [mes(2026, 1), mes(2026, 2), mes(2026, 3)];
  for (const u of unidadesConProp) {
    for (const p of periodos) {
      const existe = await prisma.cargo.findFirst({
        where: { unidadId: u.id, conceptoCobroId: concepto!.id, periodo: p, estado: { not: "ANULADO" } },
      });
      if (!existe) {
        await prisma.cargo.create({
          data: {
            unidadId: u.id,
            conceptoCobroId: concepto!.id,
            periodo: p,
            descripcion: `Cuota de Mantenimiento — ${p.toISOString().slice(0, 7)}`,
            monto: D(150),
            fechaVencimiento: new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 15)),
          },
        });
      }
    }
  }
  console.log(`  Demo: ${demo.length} unidades, cuotas ene-mar 2026`);
}

async function seedAreasComunes() {
  const count = await prisma.areaComun.count();
  if (count > 0) return;
  await prisma.areaComun.createMany({
    data: [
      { nombre: "Piscina", aforo: 40, tarifa: D(0), requiereAprobacion: false, horario: "9:00–18:00" },
      { nombre: "Zona de Parrillas", aforo: 20, tarifa: D(50), requiereAprobacion: true, horario: "10:00–22:00" },
      { nombre: "Salón Multiusos", aforo: 60, tarifa: D(150), requiereAprobacion: true, horario: "9:00–23:00" },
      { nombre: "Cancha Deportiva", aforo: 15, tarifa: D(0), requiereAprobacion: false, horario: "8:00–20:00" },
    ],
  });
}

async function seedInfracciones() {
  const infracciones = [
    { codigo: "RUIDO", descripcion: "Ruidos molestos fuera de horario", montoMin: D(100), montoMax: D(300) },
    { codigo: "MASCOTAS", descripcion: "Mascota sin correa en áreas comunes", montoMin: D(50), montoMax: D(150) },
    { codigo: "PISCINA", descripcion: "Mal uso de la piscina", montoMin: D(100), montoMax: D(200) },
    { codigo: "OBRAS", descripcion: "Obras sin autorización", montoMin: D(300), montoMax: D(1000) },
  ];
  for (const i of infracciones) {
    await prisma.infraccion.upsert({
      where: { codigo: i.codigo },
      create: i,
      update: { descripcion: i.descripcion },
    });
  }
}

async function seedTrabajadores() {
  const count = await prisma.trabajador.count();
  if (count > 0) return;
  await prisma.trabajador.createMany({
    data: [
      { nombre: "Trabajador Demo 1", puesto: "Jardinero", tipo: "MANTENIMIENTO", sueldoBase: D(1200) },
      { nombre: "Trabajador Demo 2", puesto: "Piscinero", tipo: "MANTENIMIENTO", sueldoBase: D(1300) },
      { nombre: "Trabajador Demo 3", puesto: "Administrador", tipo: "ADMINISTRATIVO", sueldoBase: D(2500) },
    ],
  });
}

async function seedOperacionDemo() {
  const comCount = await prisma.comunicado.count();
  if (comCount === 0) {
    await prisma.comunicado.create({
      data: {
        titulo: "Mantenimiento de la piscina",
        cuerpo:
          "Estimados vecinos, la piscina estará en mantenimiento el próximo lunes de 8:00 a 12:00. Disculpen las molestias.",
        audiencia: { tipo: "TODOS" },
      },
    });
  }
  const incCount = await prisma.incidencia.count();
  if (incCount === 0) {
    const inc = await prisma.incidencia.create({
      data: {
        codigo: "INC-0001",
        categoria: "ELECTRICO",
        titulo: "Luminaria quemada en el parque central",
        descripcion: "La luminaria del parque frente a la manzana B no enciende.",
        prioridad: "MEDIA",
      },
    });
    await prisma.incidenciaEvento.create({
      data: { incidenciaId: inc.id, estado: "REPORTADA", comentario: "Incidencia reportada" },
    });
  }
}

async function main() {
  console.log("Sembrando datos…");
  await seedConfiguracion();
  await seedCondominio();
  await seedSectores();
  await seedTarifas();
  await seedConceptos();
  await seedPartidas();
  await seedRolesPermisos();
  await seedSuperAdmin();
  await seedAreasComunes();
  await seedInfracciones();
  await seedTrabajadores();
  await seedDemo();
  await seedOperacionDemo();
  console.log("Seed completado ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
