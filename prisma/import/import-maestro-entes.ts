/**
 * Importa el padrón real (propietarios + unidades + titularidad) desde el
 * archivo "Maestro ENTES.xlsx" (hoja "Padron ordenado"), exportado previamente
 * a CSV con separador ";". Ver docs/05-MIGRACION-DATOS.md para el mapeo completo.
 *
 * Uso:
 *   tsx prisma/import/import-maestro-entes.ts <ruta-csv>              (dry-run: solo reporta)
 *   tsx prisma/import/import-maestro-entes.ts <ruta-csv> --apply       (aplica los cambios)
 *
 * El CSV NUNCA se versiona en el repo (contiene datos personales reales).
 */
import { PrismaClient, TipoUnidad } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const SECTORES_VALIDOS = new Set(["MA_C", "MA_A", "MA_O", "MA_N"]);
// Unidades confirmadas como "Terreno sin construir" (hoja Seguridad del padrón real).
const TERRENOS_ML = new Set(["A_23", "J_2", "J_1"]);

// ── Parser CSV con soporte de comillas y saltos de línea embebidos ─────────
function parseCsv(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanText(s?: string): string {
  return (s ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function splitEmails(s: string): string[] {
  return cleanText(s)
    .split(/[;,]+/)
    .map((x) => x.trim())
    .filter((x) => x.includes("@"));
}

function splitPhones(s: string): string[] {
  return cleanText(s)
    .split(/[/;,]+/)
    .map((x) => x.trim())
    .filter((x) => /\d{6,}/.test(x));
}

interface FilaPadron {
  fila: number;
  sector: string;
  ml: string;
  manzana: string;
  lote: string;
  codigo: string;
  titular: string | null;
  cotitular: string | null;
  emails: string[];
  telefonos: string[];
  canalEnvio: "CORREO" | "WHATSAPP";
}

interface ReporteImportacion {
  totalFilas: number;
  prop: number;
  omitidasNoProp: number;
  omitidasSectorInvalido: number;
  omitidasSinML: number;
  unidadesSinPropietario: number;
  unidadesConDosPropietarios: number;
  porSector: Record<string, number>;
  duplicadosCodigo: string[];
}

function parsePadron(rows: string[][]): { filas: FilaPadron[]; reporte: ReporteImportacion } {
  const reporte: ReporteImportacion = {
    totalFilas: 0,
    prop: 0,
    omitidasNoProp: 0,
    omitidasSectorInvalido: 0,
    omitidasSinML: 0,
    unidadesSinPropietario: 0,
    unidadesConDosPropietarios: 0,
    porSector: {},
    duplicadosCodigo: [],
  };
  const filas: FilaPadron[] = [];
  const vistos = new Set<string>();

  // Filas de datos empiezan en la 3ra línea (2 filas de encabezado).
  for (let r = 2; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 9) continue;
    const tipoEnte = cleanText(cols[2]);
    if (!tipoEnte) continue; // línea vacía / artefacto
    reporte.totalFilas++;

    if (tipoEnte !== "PROP") {
      reporte.omitidasNoProp++;
      continue;
    }
    reporte.prop++;

    const sector = cleanText(cols[3]);
    const ml = cleanText(cols[4]);
    if (!SECTORES_VALIDOS.has(sector)) {
      reporte.omitidasSectorInvalido++;
      continue;
    }
    if (!ml) {
      reporte.omitidasSinML++;
      continue;
    }

    const codigo = `${sector}-${ml}`;
    if (vistos.has(codigo)) {
      reporte.duplicadosCodigo.push(codigo);
      continue;
    }
    vistos.add(codigo);

    const idx = ml.indexOf("_");
    const manzana = idx >= 0 ? ml.slice(0, idx) : ml;
    const lote = idx >= 0 ? ml.slice(idx + 1) : "";

    const p1 = cleanText(cols[7]);
    const p2 = cleanText(cols[8]);
    const titular = p1 || p2 || null;
    const cotitular = p1 && p2 ? p2 : null;
    if (!titular) reporte.unidadesSinPropietario++;
    if (cotitular) reporte.unidadesConDosPropietarios++;

    const emails = [...new Set([...splitEmails(cols[9] ?? ""), ...splitEmails(cols[12] ?? "")])];
    const telefonos = [
      ...new Set([...splitPhones(cols[10] ?? ""), ...splitPhones(cols[13] ?? "")]),
    ];
    const envio = cleanText(cols[11]);
    const canalEnvio: "CORREO" | "WHATSAPP" = /whatsapp/i.test(envio) ? "WHATSAPP" : "CORREO";

    reporte.porSector[sector] = (reporte.porSector[sector] ?? 0) + 1;

    filas.push({
      fila: r + 1,
      sector,
      ml,
      manzana,
      lote,
      codigo,
      titular,
      cotitular,
      emails,
      telefonos,
      canalEnvio,
    });
  }

  return { filas, reporte };
}

// ── Limpieza de datos de ejemplo (demo) antes de la carga real ─────────────
async function limpiarDatosDemo(): Promise<void> {
  console.log("Limpiando datos demo previos…");
  await prisma.vehiculo.deleteMany({});
  await prisma.aplicacionPago.deleteMany({});
  await prisma.reciboCaja.deleteMany({});
  await prisma.saldoFavorMovimiento.deleteMany({});
  await prisma.saldoFavor.deleteMany({});
  await prisma.pago.deleteMany({});
  await prisma.cargo.deleteMany({});
  await prisma.emision.deleteMany({});
  await prisma.propiedadTitularidad.deleteMany({});
  await prisma.unidad.deleteMany({});
  await prisma.propietario.deleteMany({});
  console.log("  ✔ Datos demo eliminados");
}

async function importar(filas: FilaPadron[]): Promise<void> {
  const sectores = await prisma.sector.findMany();
  const sectorId = new Map(sectores.map((s) => [s.codigo, s.id]));
  const propietarioIdPorNombre = new Map<string, string>();

  async function getOrCreatePropietario(
    nombre: string,
    email: string | null,
    telefono: string | null,
    canalEnvio: "CORREO" | "WHATSAPP",
  ): Promise<string> {
    const key = nombre.trim().toLowerCase();
    const existente = propietarioIdPorNombre.get(key);
    if (existente) return existente;
    const creado = await prisma.propietario.create({
      data: { nombre, email, telefono, canalEnvio },
    });
    propietarioIdPorNombre.set(key, creado.id);
    return creado.id;
  }

  let creadas = 0;
  let conTitular = 0;
  for (const f of filas) {
    const sId = sectorId.get(f.sector);
    if (!sId) continue;

    const tipo: TipoUnidad = TERRENOS_ML.has(f.ml) ? "TERRENO" : "CASA";
    const unidad = await prisma.unidad.create({
      data: {
        codigo: f.codigo,
        sectorId: sId,
        manzana: f.manzana,
        lote: f.lote,
        tipo,
      },
    });
    creadas++;

    if (f.titular) {
      const emailTitular = f.emails[0] ?? null;
      const telTitular = f.telefonos[0] ?? null;
      const titularId = await getOrCreatePropietario(
        f.titular,
        emailTitular,
        telTitular,
        f.canalEnvio,
      );
      await prisma.propiedadTitularidad.create({
        data: {
          propietarioId: titularId,
          unidadId: unidad.id,
          esResponsablePago: true,
          porcentaje: f.cotitular ? 50 : 100,
        },
      });
      conTitular++;

      if (f.cotitular) {
        const cotitularId = await getOrCreatePropietario(f.cotitular, null, null, "CORREO");
        await prisma.propiedadTitularidad.create({
          data: {
            propietarioId: cotitularId,
            unidadId: unidad.id,
            esResponsablePago: false,
            porcentaje: 50,
          },
        });
      }
    }
  }

  console.log(`  ✔ ${creadas} unidades creadas, ${conTitular} con propietario asignado`);
  console.log(`  ✔ ${propietarioIdPorNombre.size} propietarios únicos`);
}

async function main() {
  const csvPath = process.argv[2];
  const aplicar = process.argv.includes("--apply");
  if (!csvPath) {
    console.error("Uso: tsx prisma/import/import-maestro-entes.ts <ruta-csv> [--apply]");
    process.exit(1);
  }

  const text = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const rows = parseCsv(text);
  const { filas, reporte } = parsePadron(rows);

  console.log("── Reporte de análisis ──────────────────────────────");
  console.log(JSON.stringify(reporte, null, 2));
  console.log(`Unidades válidas a importar: ${filas.length}`);
  console.log("Muestra (primeras 5):");
  console.log(
    filas
      .slice(0, 5)
      .map((f) => `  ${f.codigo} — ${f.titular ?? "(sin propietario)"} ${f.cotitular ? "+ " + f.cotitular : ""}`)
      .join("\n"),
  );

  if (!aplicar) {
    console.log("\n(dry-run: no se escribió nada. Ejecuta con --apply para aplicar los cambios)");
    return;
  }

  await limpiarDatosDemo();
  console.log("Importando padrón real…");
  await importar(filas);
  console.log("Importación completada ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
