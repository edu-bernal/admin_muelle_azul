/**
 * Importa el padrón real (propietarios + unidades + titularidad) desde
 * "PADRON.xlsx" (hoja "Padron ordenado"), el archivo vivo y autoritativo
 * de la administración — columnas: Num, SECTOR, MANZANA, LOTE, M&L,
 * PROPIETARIO 1, PROPIETARIO 2, CORREO 1, TELEFONO 1, CORREO 2, TELEFONO 2, Envio.
 *
 * Reemplaza a import-maestro-entes.ts como fuente canónica del padrón
 * (ver docs/05-MIGRACION-DATOS.md).
 *
 * Uso:
 *   tsx prisma/import/import-padron.ts <ruta-csv>              (dry-run: solo reporta)
 *   tsx prisma/import/import-padron.ts <ruta-csv> --apply       (aplica los cambios)
 *
 * El CSV NUNCA se versiona en el repo (contiene datos personales reales).
 */
import { PrismaClient, TipoUnidad } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const SECTOR_MAP: Record<string, string> = {
  MAC: "MA_C",
  MAA: "MA_A",
  MAO: "MA_O",
  MAN: "MA_N",
};
// Unidades confirmadas como "Terreno sin construir" (hoja Seguridad del padrón).
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

/** Solo se marca WHATSAPP con coincidencia exacta; "Pendiente no tiene whatsapp" debe quedar en CORREO. */
function parseCanalEnvio(s: string): "CORREO" | "WHATSAPP" {
  return cleanText(s).toLowerCase() === "whatsapp" ? "WHATSAPP" : "CORREO";
}

interface FilaPadron {
  fila: number;
  sector: string;
  manzana: string;
  lote: string;
  ml: string;
  codigo: string;
  titular: string | null;
  cotitular: string | null;
  emails: string[];
  telefonos: string[];
  canalEnvio: "CORREO" | "WHATSAPP";
}

interface ReporteImportacion {
  totalFilas: number;
  omitidasSectorInvalido: number;
  placeholdersDetectados: number;
  unidadesSinPropietario: number;
  unidadesConDosPropietarios: number;
  porSector: Record<string, number>;
  duplicadosCodigo: string[];
}

function esPlaceholder(valor: string, sector: string, ml: string): boolean {
  return valor === `${sector} ${ml}`;
}

function parsePadron(rows: string[][]): { filas: FilaPadron[]; reporte: ReporteImportacion } {
  const reporte: ReporteImportacion = {
    totalFilas: 0,
    omitidasSectorInvalido: 0,
    placeholdersDetectados: 0,
    unidadesSinPropietario: 0,
    unidadesConDosPropietarios: 0,
    porSector: {},
    duplicadosCodigo: [],
  };
  const filas: FilaPadron[] = [];
  const vistos = new Set<string>();

  // Fila 1 = encabezado. Los datos empiezan en la fila 2 (índice 1).
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 6) continue;
    const num = cleanText(cols[0]);
    if (!num) continue;
    reporte.totalFilas++;

    const sectorRaw = cleanText(cols[1]);
    const manzana = cleanText(cols[2]);
    const lote = cleanText(cols[3]);
    const ml = cleanText(cols[4]);
    const sector = SECTOR_MAP[sectorRaw];
    if (!sector || !ml) {
      reporte.omitidasSectorInvalido++;
      continue;
    }

    const codigo = `${sector}-${ml}`;
    if (vistos.has(codigo)) {
      reporte.duplicadosCodigo.push(codigo);
      continue;
    }
    vistos.add(codigo);

    let p1 = cleanText(cols[5]);
    let p2 = cleanText(cols[6]);
    if (esPlaceholder(p1, sector, ml)) {
      reporte.placeholdersDetectados++;
      p1 = "";
    }
    if (esPlaceholder(p2, sector, ml)) {
      reporte.placeholdersDetectados++;
      p2 = "";
    }

    const titular = p1 || p2 || null;
    const cotitular = p1 && p2 ? p2 : null;
    if (!titular) reporte.unidadesSinPropietario++;
    if (cotitular) reporte.unidadesConDosPropietarios++;

    const emails = [
      ...new Set([...splitEmails(cols[7] ?? ""), ...splitEmails(cols[9] ?? "")]),
    ];
    const telefonos = [
      ...new Set([...splitPhones(cols[8] ?? ""), ...splitPhones(cols[10] ?? "")]),
    ];
    const canalEnvio = parseCanalEnvio(cols[11] ?? "");

    reporte.porSector[sector] = (reporte.porSector[sector] ?? 0) + 1;

    filas.push({
      fila: r + 1,
      sector,
      manzana,
      lote,
      ml,
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

// ── Limpieza de datos previos antes de la carga ────────────────────────────
async function limpiarDatosPrevios(): Promise<void> {
  console.log("Limpiando padrón anterior…");
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
  console.log("  ✔ Padrón anterior eliminado");
}

async function importar(filas: FilaPadron[]): Promise<void> {
  const sectores = await prisma.sector.findMany();
  const sectorId = new Map(sectores.map((s) => [s.codigo, s.id]));
  const propietarioIdPorNombre = new Map<string, string>();

  async function getOrCreatePropietario(
    nombre: string,
    email: string | null,
    emailSecundario: string | null,
    telefono: string | null,
    telefonoSecundario: string | null,
    canalEnvio: "CORREO" | "WHATSAPP",
  ): Promise<string> {
    const key = nombre.trim().toLowerCase();
    const existente = propietarioIdPorNombre.get(key);
    if (existente) return existente;
    const creado = await prisma.propietario.create({
      data: { nombre, email, emailSecundario, telefono, telefonoSecundario, canalEnvio },
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
      const titularId = await getOrCreatePropietario(
        f.titular,
        f.emails[0] ?? null,
        f.emails[1] ?? null,
        f.telefonos[0] ?? null,
        f.telefonos[1] ?? null,
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
        const cotitularId = await getOrCreatePropietario(
          f.cotitular,
          null,
          null,
          null,
          null,
          "CORREO",
        );
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
    console.error("Uso: tsx prisma/import/import-padron.ts <ruta-csv> [--apply]");
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
      .map(
        (f) =>
          `  ${f.codigo} — ${f.titular ?? "(sin propietario)"}${f.cotitular ? " + " + f.cotitular : ""}`,
      )
      .join("\n"),
  );
  console.log("Unidades sin propietario (muestra):");
  console.log(
    filas
      .filter((f) => !f.titular)
      .map((f) => `  ${f.codigo}`)
      .join("\n"),
  );

  if (!aplicar) {
    console.log("\n(dry-run: no se escribió nada. Ejecuta con --apply para aplicar los cambios)");
    return;
  }

  await limpiarDatosPrevios();
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
