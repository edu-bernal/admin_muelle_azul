/**
 * Actualiza el tipo de propiedad (CASA / TERRENO) del maestro de propiedades
 * a partir de la hoja "Casas.xlsx" de la administración, exportada a CSV con
 * dos columnas:
 *
 *   codigo,tipo
 *   MA_C-A_1,TERRENO
 *   MA_C-A_3,CASA
 *
 * El código es {SECTOR}-{M&L}. Si el sector viene como "#N/A" —la fórmula
 * VLOOKUP del Excel no encontró el sector— la unidad se resuelve por el M&L
 * siempre que este identifique a una sola propiedad; si no, se reporta y no
 * se toca.
 *
 * Uso:
 *   tsx prisma/import/actualizar-tipo-unidad.ts <ruta-csv>           (simulación)
 *   tsx prisma/import/actualizar-tipo-unidad.ts <ruta-csv> --apply   (aplica)
 *
 * Antes de aplicar deja un respaldo en Tablas/respaldos/ con el tipo anterior
 * de cada unidad, que es lo que permite volver atrás.
 *
 * CUIDADO: el tipo determina la cuota mensual (TipoUnidad.valor), así que
 * cambiarlo cambia lo que se emitirá de aquí en adelante. Las cuotas ya
 * emitidas no se tocan.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const APLICAR = process.argv.includes("--apply");
const RUTA_CSV = process.argv.find((a) => !a.startsWith("--") && /\.(csv|tsv|txt)$/i.test(a));

interface FilaCsv {
  codigo: string;
  tipo: string;
}

function leerCsv(ruta: string): FilaCsv[] {
  const texto = readFileSync(ruta, "utf8").replace(/^﻿/, "");
  const separador = texto.includes("\t") ? "\t" : ",";
  const filas: FilaCsv[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const [codigo, tipo] = linea.split(separador).map((c) => c.trim());
    if (!codigo || !tipo) continue;
    // Cabecera, la traiga o no el archivo.
    if (codigo.toLowerCase() === "codigo") continue;
    filas.push({ codigo, tipo: tipo.toUpperCase() });
  }
  return filas;
}

async function main(): Promise<void> {
  if (!RUTA_CSV) {
    console.error(
      "Falta la ruta del CSV.\n" +
        "  tsx prisma/import/actualizar-tipo-unidad.ts Tablas/casas-tipo.csv\n" +
        "  tsx prisma/import/actualizar-tipo-unidad.ts Tablas/casas-tipo.csv --apply",
    );
    process.exit(1);
  }

  const filas = leerCsv(RUTA_CSV);
  console.log(`Archivo: ${RUTA_CSV}`);
  console.log(`Filas leídas: ${filas.length}\n`);

  const tipos = await prisma.tipoUnidad.findMany();
  const tipoPorCodigo = new Map(tipos.map((t) => [t.codigo.toUpperCase(), t]));

  const desconocidos = [...new Set(filas.map((f) => f.tipo))].filter(
    (t) => !tipoPorCodigo.has(t),
  );
  if (desconocidos.length) {
    console.error(
      `El archivo usa tipos que no existen en el maestro: ${desconocidos.join(", ")}\n` +
        `Tipos disponibles: ${tipos.map((t) => t.codigo).join(", ")}\n` +
        "Créalos en Parámetros del sistema o corrige el archivo.",
    );
    process.exit(1);
  }

  const unidades = await prisma.unidad.findMany({
    select: { id: true, codigo: true, tipoId: true, tipo: { select: { codigo: true } } },
    orderBy: { codigo: "asc" },
  });
  const porCodigo = new Map(unidades.map((u) => [u.codigo, u]));

  // Índice por M&L (lo que va tras el primer guion) para rescatar las filas
  // cuyo sector quedó en #N/A. Solo sirve si ese M&L es único.
  const porSufijo = new Map<string, typeof unidades>();
  for (const u of unidades) {
    const sufijo = u.codigo.split("-").slice(1).join("-");
    porSufijo.set(sufijo, [...(porSufijo.get(sufijo) ?? []), u]);
  }

  const cambios: { id: string; codigo: string; de: string; a: string; tipoId: string }[] = [];
  const iguales: string[] = [];
  const rescatadas: string[] = [];
  const noEncontradas: string[] = [];
  const ambiguas: string[] = [];
  const vistas = new Set<string>();

  for (const f of filas) {
    let unidad = porCodigo.get(f.codigo);
    if (!unidad) {
      const sufijo = f.codigo.split("-").slice(1).join("-");
      const candidatas = porSufijo.get(sufijo) ?? [];
      if (candidatas.length === 1) {
        unidad = candidatas[0];
        rescatadas.push(`${f.codigo} → ${unidad.codigo}`);
      } else if (candidatas.length > 1) {
        ambiguas.push(`${f.codigo} (${candidatas.map((c) => c.codigo).join(", ")})`);
        continue;
      } else {
        noEncontradas.push(f.codigo);
        continue;
      }
    }

    if (vistas.has(unidad.id)) continue;
    vistas.add(unidad.id);

    const nuevo = tipoPorCodigo.get(f.tipo)!;
    if (unidad.tipo.codigo === nuevo.codigo) {
      iguales.push(unidad.codigo);
    } else {
      cambios.push({
        id: unidad.id,
        codigo: unidad.codigo,
        de: unidad.tipo.codigo,
        a: nuevo.codigo,
        tipoId: nuevo.id,
      });
    }
  }

  const sinTocar = unidades.filter((u) => !vistas.has(u.id));

  console.log("Situación actual del maestro:");
  for (const t of tipos) {
    const n = unidades.filter((u) => u.tipo.codigo === t.codigo).length;
    const valor = t.valor === null ? "sin valor propio (usa la tarifa)" : `S/ ${t.valor}`;
    console.log(`  ${t.codigo.padEnd(10)} ${String(n).padStart(4)} propiedades · cuota ${valor}`);
  }

  console.log("\nResultado de cruzar el archivo con la base:");
  console.log(`  Cambian de tipo:            ${cambios.length}`);
  console.log(`  Ya estaban correctas:       ${iguales.length}`);
  console.log(`  Resueltas por M&L:          ${rescatadas.length}`);
  console.log(`  No encontradas en la base:  ${noEncontradas.length}`);
  console.log(`  Ambiguas (no se tocan):     ${ambiguas.length}`);
  console.log(`  Fuera del archivo:          ${sinTocar.length} (se quedan como están)`);

  if (rescatadas.length) console.log(`\n  Rescatadas: ${rescatadas.join(", ")}`);
  if (noEncontradas.length) console.log(`\n  Sin correspondencia: ${noEncontradas.join(", ")}`);
  if (ambiguas.length) console.log(`\n  Ambiguas: ${ambiguas.join(", ")}`);
  if (sinTocar.length) {
    const resumen = new Map<string, number>();
    for (const u of sinTocar) resumen.set(u.tipo.codigo, (resumen.get(u.tipo.codigo) ?? 0) + 1);
    console.log(
      `\n  Fuera del archivo por tipo: ${[...resumen].map(([t, n]) => `${t} ${n}`).join(", ")}`,
    );
  }

  if (cambios.length) {
    const resumen = new Map<string, number>();
    for (const c of cambios) resumen.set(`${c.de} → ${c.a}`, (resumen.get(`${c.de} → ${c.a}`) ?? 0) + 1);
    console.log("\nCambios por sentido:");
    for (const [sentido, n] of resumen) console.log(`  ${sentido}: ${n}`);
    console.log("\nPrimeros 20:");
    for (const c of cambios.slice(0, 20)) console.log(`  ${c.codigo}: ${c.de} → ${c.a}`);
  }

  console.log(
    "\nRecuerda: el tipo define la cuota mensual. Tras aplicar, revisa el valor\n" +
      "de cada tipo en Parámetros del sistema antes de la siguiente emisión.\n" +
      "Las cuotas ya emitidas no cambian.",
  );

  if (!APLICAR) {
    console.log("\nSIMULACIÓN — no se escribió nada. Añade --apply para aplicar.");
    return;
  }
  if (!cambios.length) {
    console.log("\nNo hay nada que aplicar.");
    return;
  }

  // Respaldo antes de tocar nada: es lo que permite deshacer.
  const carpeta = join(process.cwd(), "Tablas", "respaldos");
  mkdirSync(carpeta, { recursive: true });
  const archivo = join(carpeta, `unidad-tipos-antes-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(
    archivo,
    JSON.stringify(
      unidades.map((u) => ({ id: u.id, codigo: u.codigo, tipo: u.tipo.codigo })),
      null,
      1,
    ),
    "utf8",
  );
  console.log(`\nRespaldo del estado anterior: ${archivo}`);

  // Una actualización por tipo destino en vez de 400 sueltas.
  const porDestino = new Map<string, string[]>();
  for (const c of cambios) porDestino.set(c.tipoId, [...(porDestino.get(c.tipoId) ?? []), c.id]);

  await prisma.$transaction(async (tx) => {
    for (const [tipoId, ids] of porDestino) {
      await tx.unidad.updateMany({ where: { id: { in: ids } }, data: { tipoId } });
    }
    await tx.auditLog.create({
      data: {
        accion: "ACTUALIZAR_TIPO_UNIDAD_MASIVO",
        entidad: "Unidad",
        datosDespues: {
          archivo: RUTA_CSV,
          respaldo: archivo,
          cambios: cambios.map((c) => ({ codigo: c.codigo, de: c.de, a: c.a })),
        },
      },
    });
  });

  console.log(`${cambios.length} propiedades actualizadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
