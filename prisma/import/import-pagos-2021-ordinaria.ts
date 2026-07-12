/**
 * Importa los pagos históricos de cuota ORDINARIA de 2021 desde
 * "Tablas/PAGOS2021.xlsx" (hoja "ORDINARIA") — columnas: Num, SECTOR,
 * MANZANA, LOTE, M&L, PROPIETARIO 1, Pago, FECHA PAGO.
 *
 * A diferencia del registro de pagos en vivo (que aplica por FIFO al cargo
 * más antiguo), aquí SÍ sabemos con certeza qué mes cubre cada pago (la
 * fecha es el fin del mes correspondiente), así que se aplica directamente
 * al cargo MANT de esa unidad + ese período — nunca por FIFO genérico.
 *
 * No genera ReciboCaja: son pagos históricos migrados (medio MIGRACION),
 * no deben consumir la numeración correlativa real (que continúa desde 799
 * para los recibos emitidos en vivo por la app).
 *
 * Uso:
 *   tsx prisma/import/import-pagos-2021-ordinaria.ts <ruta-csv>              (dry-run)
 *   tsx prisma/import/import-pagos-2021-ordinaria.ts <ruta-csv> --apply      (aplica)
 *
 * El CSV NUNCA se versiona en el repo (contiene datos personales reales).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const ZERO = new Prisma.Decimal(0);

const SECTOR_MAP: Record<string, string> = {
  MAC: "MA_C",
  MAA: "MA_A",
  MAO: "MA_O",
  MAN: "MA_N",
};

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

function parseFechaDDMMYYYY(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
}

function primerDiaDelMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

interface FilaPago {
  fila: number;
  codigo: string;
  monto: number;
  fechaPago: Date;
  periodo: Date;
  propietarioNombreHoja: string;
}

interface ReporteImportacion {
  totalFilas: number;
  omitidasFormato: number;
  totalMonto: number;
  porSector: Record<string, number>;
}

function parsePagos(rows: string[][]): { filas: FilaPago[]; reporte: ReporteImportacion } {
  const reporte: ReporteImportacion = {
    totalFilas: 0,
    omitidasFormato: 0,
    totalMonto: 0,
    porSector: {},
  };
  const filas: FilaPago[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 8) continue;
    const num = cleanText(cols[0]);
    if (!num) continue;
    reporte.totalFilas++;

    const sectorRaw = cleanText(cols[1]);
    const ml = cleanText(cols[4]);
    const montoStr = cleanText(cols[6]);
    const fechaStr = cleanText(cols[7]);
    const sector = SECTOR_MAP[sectorRaw];
    const monto = Number(montoStr);
    const fechaPago = parseFechaDDMMYYYY(fechaStr);

    if (!sector || !ml || !monto || monto <= 0 || !fechaPago) {
      reporte.omitidasFormato++;
      continue;
    }

    reporte.totalMonto += monto;
    reporte.porSector[sector] = (reporte.porSector[sector] ?? 0) + 1;

    filas.push({
      fila: r + 1,
      codigo: `${sector}-${ml}`,
      monto,
      fechaPago,
      periodo: primerDiaDelMes(fechaPago),
      propietarioNombreHoja: cleanText(cols[5]),
    });
  }

  return { filas, reporte };
}

interface ValidacionFila extends FilaPago {
  problema?: string;
  unidadId?: string;
  cargoId?: string;
  propietarioId?: string;
  propietarioNombreDb?: string;
}

async function validarFilas(filas: FilaPago[]): Promise<ValidacionFila[]> {
  const concepto = await prisma.conceptoCobro.findUnique({ where: { codigo: "MANT" } });
  if (!concepto) throw new Error("Concepto MANT no existe");

  const resultado: ValidacionFila[] = [];
  for (const f of filas) {
    const unidad = await prisma.unidad.findUnique({
      where: { codigo: f.codigo },
      include: {
        titularidades: {
          where: { fechaFin: null, esResponsablePago: true },
          include: { propietario: true },
        },
      },
    });
    if (!unidad) {
      resultado.push({ ...f, problema: "Unidad no encontrada" });
      continue;
    }
    const responsable = unidad.titularidades[0];
    if (!responsable) {
      resultado.push({ ...f, problema: "Unidad sin responsable de pago", unidadId: unidad.id });
      continue;
    }
    const cargo = await prisma.cargo.findFirst({
      where: {
        unidadId: unidad.id,
        conceptoCobroId: concepto.id,
        periodo: f.periodo,
        estado: { not: "ANULADO" },
      },
      include: { aplicaciones: true },
    });
    if (!cargo) {
      resultado.push({
        ...f,
        problema: "No existe cargo MANT para esa unidad/período (¿falta la emisión?)",
        unidadId: unidad.id,
        propietarioId: responsable.propietarioId,
      });
      continue;
    }
    const aplicado = cargo.aplicaciones.reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
    const saldo = new Prisma.Decimal(cargo.monto).minus(aplicado);
    if (saldo.lte(ZERO)) {
      resultado.push({
        ...f,
        problema: "El cargo de ese período ya está totalmente pagado",
        unidadId: unidad.id,
        cargoId: cargo.id,
        propietarioId: responsable.propietarioId,
      });
      continue;
    }
    resultado.push({
      ...f,
      unidadId: unidad.id,
      cargoId: cargo.id,
      propietarioId: responsable.propietarioId,
      propietarioNombreDb: responsable.propietario.nombre,
    });
  }
  return resultado;
}

async function aplicarPagos(validas: ValidacionFila[]): Promise<{ aplicados: number; totalAplicado: number }> {
  let aplicados = 0;
  let totalAplicado = 0;

  for (const f of validas) {
    if (f.problema || !f.unidadId || !f.cargoId || !f.propietarioId) continue;

    await prisma.$transaction(async (tx) => {
      const cargo = await tx.cargo.findUniqueOrThrow({
        where: { id: f.cargoId! },
        include: { aplicaciones: true },
      });
      const aplicadoPrevio = cargo.aplicaciones.reduce(
        (acc, a) => acc.plus(a.montoAplicado),
        ZERO,
      );
      const saldoCargo = new Prisma.Decimal(cargo.monto).minus(aplicadoPrevio);
      if (saldoCargo.lte(ZERO)) return;

      const montoPago = new Prisma.Decimal(f.monto);
      const montoAplicado = montoPago.lt(saldoCargo) ? montoPago : saldoCargo;
      const excedente = montoPago.minus(montoAplicado);

      const pago = await tx.pago.create({
        data: {
          propietarioId: f.propietarioId!,
          fechaPago: f.fechaPago,
          monto: montoPago,
          medio: "MIGRACION",
          declaradoPor: "ADMIN",
          estado: "CONFIRMADO",
          validadoAt: f.fechaPago,
        },
      });

      await tx.aplicacionPago.create({
        data: { pagoId: pago.id, cargoId: f.cargoId!, montoAplicado },
      });

      const nuevoAplicado = aplicadoPrevio.plus(montoAplicado);
      const cubierto = nuevoAplicado.gte(new Prisma.Decimal(cargo.monto));
      await tx.cargo.update({
        where: { id: f.cargoId! },
        data: { estado: cubierto ? "PAGADO" : "PARCIAL" },
      });

      if (excedente.gt(ZERO)) {
        const saldoFavor = await tx.saldoFavor.upsert({
          where: { propietarioId: f.propietarioId! },
          create: { propietarioId: f.propietarioId!, montoDisponible: excedente },
          update: { montoDisponible: { increment: excedente } },
        });
        await tx.saldoFavorMovimiento.create({
          data: { saldoFavorId: saldoFavor.id, pagoId: pago.id, monto: excedente, signo: 1 },
        });
      }

      await tx.auditLog.create({
        data: {
          accion: "IMPORTAR_PAGO_HISTORICO",
          entidad: "Pago",
          entidadId: pago.id,
          datosDespues: {
            unidadCodigo: f.codigo,
            periodo: f.periodo.toISOString().slice(0, 7),
            monto: f.monto,
          },
        },
      });
    });

    aplicados++;
    totalAplicado += f.monto;
  }

  return { aplicados, totalAplicado };
}

async function main() {
  const csvPath = process.argv[2];
  const aplicar = process.argv.includes("--apply");
  if (!csvPath) {
    console.error("Uso: tsx prisma/import/import-pagos-2021-ordinaria.ts <ruta-csv> [--apply]");
    process.exit(1);
  }

  const text = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const rows = parseCsv(text);
  const { filas, reporte } = parsePagos(rows);

  console.log("── Reporte de parseo ──────────────────────────────");
  console.log(JSON.stringify(reporte, null, 2));

  console.log("\nValidando contra la base de datos…");
  const validadas = await validarFilas(filas);
  const conProblema = validadas.filter((v) => v.problema);
  const validas = validadas.filter((v) => !v.problema);

  console.log(`Filas válidas para aplicar: ${validas.length}`);
  console.log(`Filas con problema: ${conProblema.length}`);
  if (conProblema.length > 0) {
    const porProblema = new Map<string, number>();
    for (const p of conProblema) {
      porProblema.set(p.problema!, (porProblema.get(p.problema!) ?? 0) + 1);
    }
    console.log("Resumen de problemas:", JSON.stringify(Object.fromEntries(porProblema), null, 2));
    console.log("Detalle (primeras 20):");
    console.log(
      conProblema
        .slice(0, 20)
        .map((p) => `  fila ${p.fila} · ${p.codigo} · ${p.periodo.toISOString().slice(0, 7)} · ${p.problema}`)
        .join("\n"),
    );
  }

  const totalValidado = validas.reduce((a, v) => a + v.monto, 0);
  console.log(`\nMonto total a aplicar: S/ ${totalValidado.toFixed(2)}`);

  if (!aplicar) {
    console.log("\n(dry-run: no se escribió nada. Ejecuta con --apply para aplicar los cambios)");
    return;
  }

  console.log("\nAplicando pagos…");
  const res = await aplicarPagos(validas);
  console.log(`✔ ${res.aplicados} pagos aplicados por un total de S/ ${res.totalAplicado.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
