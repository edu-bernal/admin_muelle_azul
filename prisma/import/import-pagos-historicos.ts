/**
 * Importa pagos históricos de cuota ORDINARIA (concepto MANT) desde un CSV
 * con tres columnas:
 *
 *   codigo,monto,fecha
 *   MA_C-A_1,100,2022-01-31
 *
 * La fecha es el día del pago y, como en las planillas de la administración,
 * corresponde al mes que cubre: el pago se aplica al cargo MANT de esa unidad
 * y ese período, nunca por FIFO genérico — aquí sí sabemos qué mes se pagó.
 *
 * Generaliza a cualquier año lo que import-pagos-2021-ordinaria.ts hizo con
 * la hoja de 2021.
 *
 * No genera ReciboCaja: son pagos migrados (medio MIGRACION) y no deben
 * consumir la numeración correlativa real.
 *
 * Uso:
 *   tsx prisma/import/import-pagos-historicos.ts <ruta-csv>           (simulación)
 *   tsx prisma/import/import-pagos-historicos.ts <ruta-csv> --apply   (aplica)
 *
 * El CSV nunca se versiona: sale de las planillas con datos reales.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const ZERO = new Prisma.Decimal(0);
const APLICAR = process.argv.includes("--apply");
const RUTA = process.argv.find((a) => !a.startsWith("--") && /\.(csv|tsv|txt)$/i.test(a));

interface Fila {
  linea: number;
  codigo: string;
  monto: number;
  fechaPago: Date;
  periodo: Date;
}

interface Validada extends Fila {
  problema?: string;
  unidadId?: string;
  cargoId?: string;
  propietarioId?: string;
  saldoCargo?: Prisma.Decimal;
}

function leerCsv(ruta: string): { filas: Fila[]; descartadas: string[] } {
  const texto = readFileSync(ruta, "utf8").replace(/^﻿/, "");
  const sep = texto.includes("\t") ? "\t" : texto.includes(";") ? ";" : ",";
  const filas: Fila[] = [];
  const descartadas: string[] = [];

  texto.split(/\r?\n/).forEach((linea, i) => {
    if (!linea.trim()) return;
    const [codigo, montoStr, fechaStr] = linea.split(sep).map((c) => c.trim());
    if (!codigo || codigo.toLowerCase() === "codigo") return;

    const monto = Number(montoStr);
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr ?? "")
      ? new Date(`${fechaStr}T00:00:00Z`)
      : null;

    if (!Number.isFinite(monto) || monto <= 0 || !fecha) {
      descartadas.push(`línea ${i + 1}: ${linea}`);
      return;
    }
    filas.push({
      linea: i + 1,
      codigo,
      monto,
      fechaPago: fecha,
      periodo: new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1)),
    });
  });

  return { filas, descartadas };
}

async function validar(filas: Fila[]): Promise<Validada[]> {
  const concepto = await prisma.conceptoCobro.findUnique({ where: { codigo: "MANT" } });
  if (!concepto) throw new Error("No existe el concepto MANT");

  // Una sola lectura de unidades y cargos: fila por fila serían miles de idas
  // y vueltas contra una base remota.
  const unidades = await prisma.unidad.findMany({
    select: {
      id: true,
      codigo: true,
      titularidades: {
        where: { fechaFin: null, esResponsablePago: true },
        select: { propietarioId: true },
      },
    },
  });
  const porCodigo = new Map(unidades.map((u) => [u.codigo, u]));

  const periodos = [...new Set(filas.map((f) => f.periodo.getTime()))].map((t) => new Date(t));
  const cargos = await prisma.cargo.findMany({
    where: {
      conceptoCobroId: concepto.id,
      periodo: { in: periodos },
      estado: { not: "ANULADO" },
    },
    select: {
      id: true,
      unidadId: true,
      periodo: true,
      monto: true,
      aplicaciones: { select: { montoAplicado: true } },
    },
  });
  const clave = (unidadId: string, periodo: Date) => `${unidadId}|${periodo.toISOString().slice(0, 10)}`;
  const porUnidadPeriodo = new Map(cargos.map((c) => [clave(c.unidadId, c.periodo!), c]));

  // Lo ya aplicado se lleva en memoria para que dos filas del mismo mes no
  // crean, cada una, que tienen todo el saldo disponible.
  const aplicadoPorCargo = new Map<string, Prisma.Decimal>();
  for (const c of cargos) {
    aplicadoPorCargo.set(
      c.id,
      c.aplicaciones.reduce((acc, a) => acc.plus(a.montoAplicado), ZERO),
    );
  }

  return filas.map((f) => {
    const unidad = porCodigo.get(f.codigo);
    if (!unidad) return { ...f, problema: "Unidad no encontrada" };

    const responsable = unidad.titularidades[0];
    if (!responsable) return { ...f, problema: "Unidad sin responsable de pago", unidadId: unidad.id };

    const cargo = porUnidadPeriodo.get(clave(unidad.id, f.periodo));
    if (!cargo) {
      return {
        ...f,
        problema: "Sin cargo MANT para ese mes (¿falta la emisión?)",
        unidadId: unidad.id,
        propietarioId: responsable.propietarioId,
      };
    }

    const aplicado = aplicadoPorCargo.get(cargo.id) ?? ZERO;
    const saldo = new Prisma.Decimal(cargo.monto).minus(aplicado);
    if (saldo.lte(ZERO)) {
      return {
        ...f,
        problema: "El cargo de ese mes ya está pagado",
        unidadId: unidad.id,
        cargoId: cargo.id,
        propietarioId: responsable.propietarioId,
      };
    }

    // Reserva el saldo para que la siguiente fila del mismo cargo vea lo que queda.
    const aplicable = new Prisma.Decimal(f.monto).lt(saldo) ? new Prisma.Decimal(f.monto) : saldo;
    aplicadoPorCargo.set(cargo.id, aplicado.plus(aplicable));

    return {
      ...f,
      unidadId: unidad.id,
      cargoId: cargo.id,
      propietarioId: responsable.propietarioId,
      saldoCargo: saldo,
    };
  });
}

async function aplicar(validas: Validada[]): Promise<{ pagos: number; total: number; excedente: number }> {
  let pagos = 0;
  let total = 0;
  let excedenteTotal = 0;

  for (const f of validas) {
    await prisma.$transaction(async (tx) => {
      const cargo = await tx.cargo.findUniqueOrThrow({
        where: { id: f.cargoId! },
        include: { aplicaciones: true },
      });
      const aplicadoPrevio = cargo.aplicaciones.reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
      const saldo = new Prisma.Decimal(cargo.monto).minus(aplicadoPrevio);

      const montoPago = new Prisma.Decimal(f.monto);
      const montoAplicado = saldo.lte(ZERO) ? ZERO : montoPago.lt(saldo) ? montoPago : saldo;
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

      if (montoAplicado.gt(ZERO)) {
        await tx.aplicacionPago.create({
          data: { pagoId: pago.id, cargoId: cargo.id, montoAplicado },
        });
        const nuevoAplicado = aplicadoPrevio.plus(montoAplicado);
        await tx.cargo.update({
          where: { id: cargo.id },
          data: {
            estado: nuevoAplicado.gte(new Prisma.Decimal(cargo.monto)) ? "PAGADO" : "PARCIAL",
          },
        });
      }

      if (excedente.gt(ZERO)) {
        const saldoFavor = await tx.saldoFavor.upsert({
          where: { propietarioId: f.propietarioId! },
          create: { propietarioId: f.propietarioId!, montoDisponible: excedente },
          update: { montoDisponible: { increment: excedente } },
        });
        await tx.saldoFavorMovimiento.create({
          data: { saldoFavorId: saldoFavor.id, pagoId: pago.id, monto: excedente, signo: 1 },
        });
        excedenteTotal += excedente.toNumber();
      }

      await tx.auditLog.create({
        data: {
          accion: "IMPORTAR_PAGO_HISTORICO",
          entidad: "Pago",
          entidadId: pago.id,
          datosDespues: {
            archivo: RUTA,
            unidadCodigo: f.codigo,
            periodo: f.periodo.toISOString().slice(0, 7),
            monto: f.monto,
            aplicado: montoAplicado.toNumber(),
          },
        },
      });
    });

    pagos++;
    total += f.monto;
  }

  return { pagos, total, excedente: excedenteTotal };
}

async function main(): Promise<void> {
  if (!RUTA) {
    console.error(
      "Uso:\n" +
        "  tsx prisma/import/import-pagos-historicos.ts Tablas/pagos-2022.csv\n" +
        "  tsx prisma/import/import-pagos-historicos.ts Tablas/pagos-2022.csv --apply",
    );
    process.exit(1);
  }

  const { filas, descartadas } = leerCsv(RUTA);
  console.log(`Archivo: ${RUTA}`);
  console.log(`Filas leídas: ${filas.length}${descartadas.length ? ` · descartadas: ${descartadas.length}` : ""}`);
  if (descartadas.length) console.log(descartadas.slice(0, 10).map((d) => `  ${d}`).join("\n"));

  const porMes = new Map<string, { n: number; monto: number }>();
  for (const f of filas) {
    const k = f.periodo.toISOString().slice(0, 7);
    const acc = porMes.get(k) ?? { n: 0, monto: 0 };
    porMes.set(k, { n: acc.n + 1, monto: acc.monto + f.monto });
  }
  console.log("\nPor mes (archivo):");
  for (const [mes, v] of [...porMes].sort()) {
    console.log(`  ${mes}  ${String(v.n).padStart(4)} pagos  S/ ${v.monto.toFixed(2)}`);
  }

  console.log("\nValidando contra la base…");
  const validadas = await validar(filas);
  const conProblema = validadas.filter((v) => v.problema);
  const validas = validadas.filter((v) => !v.problema);

  if (conProblema.length) {
    const resumen = new Map<string, number>();
    for (const p of conProblema) resumen.set(p.problema!, (resumen.get(p.problema!) ?? 0) + 1);
    console.log("\nFilas con problema:");
    for (const [problema, n] of resumen) console.log(`  ${n.toString().padStart(4)} · ${problema}`);
    console.log("Primeras 15:");
    for (const p of conProblema.slice(0, 15)) {
      console.log(`  línea ${p.linea} · ${p.codigo} · ${p.periodo.toISOString().slice(0, 7)} · ${p.problema}`);
    }
  }

  const total = validas.reduce((a, v) => a + v.monto, 0);
  const excedente = validas.reduce(
    (a, v) => a + Math.max(0, v.monto - (v.saldoCargo?.toNumber() ?? 0)),
    0,
  );
  console.log(`\nPagos a registrar: ${validas.length} · S/ ${total.toFixed(2)}`);
  if (excedente > 0) console.log(`De ese total irían a saldo a favor: S/ ${excedente.toFixed(2)}`);

  if (!APLICAR) {
    console.log("\nSIMULACIÓN — no se escribió nada. Añade --apply para aplicar.");
    return;
  }
  if (!validas.length) {
    console.log("\nNo hay nada que aplicar.");
    return;
  }

  console.log("\nAplicando…");
  const res = await aplicar(validas);
  console.log(`${res.pagos} pagos registrados por S/ ${res.total.toFixed(2)}.`);
  if (res.excedente > 0) console.log(`S/ ${res.excedente.toFixed(2)} quedaron como saldo a favor.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
