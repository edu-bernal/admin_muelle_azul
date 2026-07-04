import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";
import { unidadIdsDePropietario } from "./shared";

export interface MovimientoEC {
  cargoId: string;
  unidadCodigo: string;
  concepto: string;
  descripcion: string;
  fechaVencimiento: string;
  monto: number;
  aplicado: number;
  saldo: number;
  estado: string;
}

export interface EstadoCuenta {
  propietarioId: string;
  propietarioNombre: string;
  unidades: string[];
  totalCargado: number;
  totalPagado: number;
  saldoFavor: number;
  saldoNeto: number; // > 0 = deuda
  movimientos: MovimientoEC[];
}

/** Estado de cuenta consolidado de un propietario (todas sus unidades). */
export async function estadoCuentaPropietario(
  propietarioId: string,
): Promise<EstadoCuenta> {
  const propietario = await prisma.propietario.findUnique({
    where: { id: propietarioId },
    include: { saldoFavor: true },
  });
  if (!propietario) throw new Error("Propietario no encontrado");

  const unidadIds = await unidadIdsDePropietario(propietarioId);
  const unidades = await prisma.unidad.findMany({
    where: { id: { in: unidadIds } },
    select: { id: true, codigo: true },
  });
  const codigoPorId = new Map(unidades.map((u) => [u.id, u.codigo]));

  const cargos = await prisma.cargo.findMany({
    where: { unidadId: { in: unidadIds }, estado: { not: "ANULADO" } },
    include: { conceptoCobro: true, aplicaciones: true },
    orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
  });

  let totalCargado = ZERO;
  let totalPagado = ZERO;
  const movimientos: MovimientoEC[] = cargos.map((c) => {
    const aplicado = c.aplicaciones.reduce(
      (acc, a) => acc.plus(a.montoAplicado),
      ZERO,
    );
    const monto = new Prisma.Decimal(c.monto);
    const saldo = monto.minus(aplicado);
    totalCargado = totalCargado.plus(monto);
    totalPagado = totalPagado.plus(aplicado);
    return {
      cargoId: c.id,
      unidadCodigo: codigoPorId.get(c.unidadId) ?? "—",
      concepto: c.conceptoCobro.nombre,
      descripcion: c.descripcion,
      fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
      monto: monto.toNumber(),
      aplicado: aplicado.toNumber(),
      saldo: saldo.toNumber(),
      estado: c.estado,
    };
  });

  const saldoFavor = propietario.saldoFavor
    ? new Prisma.Decimal(propietario.saldoFavor.montoDisponible)
    : ZERO;
  const saldoNeto = totalCargado.minus(totalPagado).minus(saldoFavor);

  return {
    propietarioId,
    propietarioNombre: propietario.nombre,
    unidades: unidades.map((u) => u.codigo),
    totalCargado: totalCargado.toNumber(),
    totalPagado: totalPagado.toNumber(),
    saldoFavor: saldoFavor.toNumber(),
    saldoNeto: saldoNeto.toNumber(),
    movimientos,
  };
}
