import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";
import { primerDiaDelMes } from "./shared";

interface TasasPlanilla {
  pension: number; // ONP/AFP descuento del trabajador
  essalud: number; // aporte del empleador (costo, no descuento)
}

async function tasas(): Promise<TasasPlanilla> {
  const cfg = await prisma.configuracion.findUnique({ where: { clave: "planilla" } });
  const v = (cfg?.valor as { pension?: number; essalud?: number }) ?? {};
  return { pension: v.pension ?? 0.13, essalud: v.essalud ?? 0.09 };
}

/**
 * Genera la planilla del período con todos los trabajadores activos, calculando
 * el descuento de pensión y aplicando adelantos pendientes. Idempotente por período.
 */
export async function generarPlanilla(
  periodo: Date,
  usuarioId?: string | null,
): Promise<{ planillaId: string; totalNeto: number; trabajadores: number }> {
  const per = primerDiaDelMes(periodo);
  const existente = await prisma.planilla.findUnique({ where: { periodo: per } });
  if (existente) throw new Error("Ya existe una planilla para este período");

  const { pension } = await tasas();
  const trabajadores = await prisma.trabajador.findMany({ where: { activo: true } });
  if (trabajadores.length === 0) throw new Error("No hay personal activo");

  const result = await prisma.$transaction(async (tx) => {
    const planilla = await tx.planilla.create({
      data: { periodo: per, estado: "ABIERTA" },
    });

    let totalNeto = ZERO;
    for (const t of trabajadores) {
      const sueldo = new Prisma.Decimal(t.sueldoBase);
      const descPension = sueldo.mul(pension);

      const adelantos = await tx.adelanto.findMany({
        where: { trabajadorId: t.id, estado: "PENDIENTE" },
      });
      const totalAdelantos = adelantos.reduce(
        (acc, a) => acc.plus(a.saldoPendiente),
        ZERO,
      );

      const neto = sueldo.minus(descPension).minus(totalAdelantos);
      totalNeto = totalNeto.plus(neto);

      await tx.planillaDetalle.create({
        data: {
          planillaId: planilla.id,
          trabajadorId: t.id,
          sueldoBase: sueldo,
          descuentos: descPension,
          adelantosDescontados: totalAdelantos,
          netoPagar: neto,
        },
      });

      for (const a of adelantos) {
        await tx.adelanto.update({
          where: { id: a.id },
          data: { estado: "DESCONTADO", saldoPendiente: ZERO },
        });
      }
    }

    await tx.planilla.update({
      where: { id: planilla.id },
      data: { totalNeto },
    });
    await audit(
      {
        usuarioId,
        accion: "GENERAR_PLANILLA",
        entidad: "Planilla",
        entidadId: planilla.id,
        datosDespues: { periodo: per.toISOString().slice(0, 7), totalNeto: totalNeto.toNumber() },
      },
      tx,
    );

    return { planillaId: planilla.id, totalNeto: totalNeto.toNumber(), trabajadores: trabajadores.length };
  });

  return result;
}

/** Marca la planilla como pagada y genera los egresos por cada trabajador. */
export async function pagarPlanilla(
  planillaId: string,
  usuarioId?: string | null,
): Promise<void> {
  const planilla = await prisma.planilla.findUnique({
    where: { id: planillaId },
    include: { detalles: true },
  });
  if (!planilla) throw new Error("Planilla no encontrada");
  if (planilla.estado === "PAGADA") throw new Error("La planilla ya fue pagada");

  const partida = await prisma.partidaPresupuesto.findUnique({
    where: { codigo: "PLANILLA" },
  });

  await prisma.$transaction(async (tx) => {
    for (const d of planilla.detalles) {
      await tx.egreso.create({
        data: {
          tipoOrigen: "PLANILLA_DETALLE",
          origenId: d.id,
          partidaId: partida?.id ?? null,
          descripcion: "Pago de planilla",
          fechaPago: new Date(),
          monto: d.netoPagar,
          medio: "TRANSFERENCIA",
        },
      });
      await tx.planillaDetalle.update({
        where: { id: d.id },
        data: { estadoPago: "PAGADO" },
      });
    }
    await tx.planilla.update({
      where: { id: planillaId },
      data: { estado: "PAGADA" },
    });
    await audit(
      {
        usuarioId,
        accion: "PAGAR_PLANILLA",
        entidad: "Planilla",
        entidadId: planillaId,
      },
      tx,
    );
  });
}
