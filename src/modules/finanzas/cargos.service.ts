import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dec, ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";

export interface EditarCargoInput {
  monto: number;
  conceptoCobroId: string;
  descripcion: string;
}

/**
 * Corrige una cuota ya emitida: su monto, su concepto y su descripción.
 *
 * Cambiar el monto altera la deuda del propietario, así que hay dos límites:
 * un cargo anulado no se toca, y el monto no puede quedar por debajo de lo que
 * ya se le aplicó en pagos — eso dejaría al propietario habiendo pagado de más
 * sin que el sistema sepa a dónde va el excedente. Para bajarlo por debajo hay
 * que soltar antes el pago.
 *
 * El estado se recalcula: subir el monto de una cuota saldada la devuelve a
 * PARCIAL, y bajarlo hasta lo aplicado la deja PAGADO.
 */
export async function editarCargo(
  cargoId: string,
  input: EditarCargoInput,
  usuarioId?: string | null,
): Promise<{ codigoUnidad: string; estado: string }> {
  return prisma.$transaction(async (tx) => {
    const cargo = await tx.cargo.findUnique({
      where: { id: cargoId },
      include: {
        aplicaciones: true,
        unidad: { select: { codigo: true } },
        conceptoCobro: { select: { codigo: true, nombre: true } },
      },
    });
    if (!cargo) throw new Error("Cuota no encontrada");
    if (cargo.estado === "ANULADO") {
      throw new Error("Una cuota anulada no se puede editar");
    }

    const monto = dec(input.monto);
    if (monto.lte(ZERO)) throw new Error("El monto debe ser mayor que cero");

    const aplicado = cargo.aplicaciones.reduce(
      (acc, a) => acc.plus(a.montoAplicado),
      ZERO,
    );
    if (monto.lt(aplicado)) {
      throw new Error(
        `Esta cuota ya tiene S/ ${aplicado.toFixed(2)} aplicados en pagos. ` +
          "Para bajarla por debajo de ese monto, primero anula o elimina el pago.",
      );
    }

    const concepto = await tx.conceptoCobro.findUnique({
      where: { id: input.conceptoCobroId },
    });
    if (!concepto) throw new Error("Concepto de cobro no válido");

    const estado = aplicado.lte(ZERO)
      ? "PENDIENTE"
      : aplicado.gte(monto)
        ? "PAGADO"
        : "PARCIAL";

    await tx.cargo.update({
      where: { id: cargoId },
      data: {
        monto,
        conceptoCobroId: concepto.id,
        descripcion: input.descripcion.trim() || concepto.nombre,
        estado,
      },
    });

    await audit(
      {
        usuarioId,
        accion: "EDITAR_CARGO",
        entidad: "Cargo",
        entidadId: cargoId,
        datosAntes: {
          unidad: cargo.unidad.codigo,
          monto: new Prisma.Decimal(cargo.monto).toString(),
          concepto: cargo.conceptoCobro.codigo,
          descripcion: cargo.descripcion,
          estado: cargo.estado,
        },
        datosDespues: {
          monto: monto.toString(),
          concepto: concepto.codigo,
          descripcion: input.descripcion.trim() || concepto.nombre,
          estado,
        },
      },
      tx,
    );

    return { codigoUnidad: cargo.unidad.codigo, estado };
  });
}
