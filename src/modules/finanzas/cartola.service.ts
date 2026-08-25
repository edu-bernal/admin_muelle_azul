import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";
import { unidadIdsDePropietario } from "./shared";

export interface MovimientoCartola {
  fechaProceso: string;
  fechaValor: string;
  descripcion: string;
  /** Aumenta la deuda (cuota emitida). */
  cargo: number | null;
  /** Reduce la deuda (pago recibido). */
  abono: number | null;
}

export interface Cartola {
  propietarioNombre: string;
  direccion: string | null;
  documento: string | null;
  unidades: string[];
  desde: string;
  hasta: string;
  saldoAnterior: number;
  movimientos: MovimientoCartola[];
  totalCargos: number;
  totalAbonos: number;
  saldoFinal: number;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Estado de cuenta en formato cartola: el movimiento de la deuda mes a mes,
 * con las cuotas emitidas en el DEBE y los pagos recibidos en el HABER, igual
 * que una cartola bancaria.
 *
 * A diferencia de `estadoCuentaPropietario`, que lista cargos con su saldo
 * pendiente, aquí interesa el orden cronológico y el arrastre del saldo.
 */
export async function cartolaPropietario(
  propietarioId: string,
  desde: Date,
  hasta: Date,
): Promise<Cartola> {
  const propietario = await prisma.propietario.findUnique({
    where: { id: propietarioId },
  });
  if (!propietario) throw new Error("Propietario no encontrado");

  const unidadIds = await unidadIdsDePropietario(propietarioId);
  const unidades = await prisma.unidad.findMany({
    where: { id: { in: unidadIds } },
    select: { codigo: true },
    orderBy: { codigo: "asc" },
  });

  const [cargos, pagos] = await Promise.all([
    prisma.cargo.findMany({
      where: { unidadId: { in: unidadIds }, estado: { not: "ANULADO" } },
      include: { unidad: { select: { codigo: true } } },
      orderBy: [{ periodo: "asc" }, { fechaVencimiento: "asc" }],
    }),
    prisma.pago.findMany({
      where: { propietarioId, estado: "CONFIRMADO" },
      orderBy: [{ fechaPago: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // La fecha que importa es el mes que cubre la cuota, no cuándo se cargó al
  // sistema: los cargos de 2021 se registraron durante la migración de 2026.
  const fechaDeCargo = (c: { periodo: Date | null; fechaVencimiento: Date }) =>
    c.periodo ?? c.fechaVencimiento;

  // El saldo anterior arrastra todo lo ocurrido antes del rango consultado.
  let saldoAnterior = ZERO;
  for (const c of cargos) {
    if (fechaDeCargo(c) < desde) saldoAnterior = saldoAnterior.plus(c.monto);
  }
  for (const p of pagos) {
    if (p.fechaPago < desde) saldoAnterior = saldoAnterior.minus(p.monto);
  }

  const movimientos: MovimientoCartola[] = [];
  let totalCargos = ZERO;
  let totalAbonos = ZERO;

  for (const c of cargos) {
    const fecha = fechaDeCargo(c);
    if (fecha < desde || fecha > hasta) continue;
    totalCargos = totalCargos.plus(c.monto);
    movimientos.push({
      fechaProceso: iso(fecha),
      fechaValor: iso(c.fechaVencimiento),
      descripcion: `${c.descripcion} ${c.unidad.codigo}`.slice(0, 46),
      cargo: new Prisma.Decimal(c.monto).toNumber(),
      abono: null,
    });
  }

  for (const p of pagos) {
    if (p.fechaPago < desde || p.fechaPago > hasta) continue;
    totalAbonos = totalAbonos.plus(p.monto);
    const referencia = p.numeroOperacion ? ` ${p.numeroOperacion}` : "";
    movimientos.push({
      fechaProceso: iso(p.fechaPago),
      fechaValor: iso(p.fechaPago),
      descripcion: `PAGO ${p.medio}${referencia}`.slice(0, 46),
      cargo: null,
      abono: new Prisma.Decimal(p.monto).toNumber(),
    });
  }

  movimientos.sort((a, b) =>
    a.fechaProceso === b.fechaProceso
      ? // Dentro del mismo día, primero la cuota y después el pago que la cubre.
        (a.cargo === null ? 1 : 0) - (b.cargo === null ? 1 : 0)
      : a.fechaProceso.localeCompare(b.fechaProceso),
  );

  return {
    propietarioNombre: propietario.nombre,
    direccion: propietario.direccionHabitual,
    documento: propietario.numeroDocumento,
    unidades: unidades.map((u) => u.codigo),
    desde: iso(desde),
    hasta: iso(hasta),
    saldoAnterior: saldoAnterior.toNumber(),
    movimientos,
    totalCargos: totalCargos.toNumber(),
    totalAbonos: totalAbonos.toNumber(),
    saldoFinal: saldoAnterior.plus(totalCargos).minus(totalAbonos).toNumber(),
  };
}
