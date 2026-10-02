import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dec, ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";

export interface EditarCargoInput {
  monto: number;
  conceptoCobroId: string;
  descripcion: string;
}

export interface EditarCargoResultado {
  codigoUnidad: string;
  estado: string;
  /** Lo que se soltó de pagos y pasó a saldo a favor al bajar la cuota. */
  devuelto: number;
}

/**
 * Corrige una cuota ya emitida: su monto, su concepto y su descripción.
 *
 * Una cuota anulada no se toca. El monto puede quedar por debajo de lo que ya
 * se le aplicó en pagos: en ese caso se suelta el excedente empezando por los
 * pagos más recientes (los últimos en llegar son los que sobraron) y ese
 * dinero pasa a saldo a favor de quien pagó, como abono de ese mismo pago.
 * Así el propietario no pierde lo pagado y, si el pago se re-aplica o se
 * anula después, el abono se deshace junto con él.
 *
 * El estado se recalcula: subir el monto de una cuota saldada la devuelve a
 * PARCIAL, y bajarlo hasta lo aplicado la deja PAGADO.
 */
export async function editarCargo(
  cargoId: string,
  input: EditarCargoInput,
  usuarioId?: string | null,
): Promise<EditarCargoResultado> {
  return prisma.$transaction(
    async (tx) => {
      const cargo = await tx.cargo.findUnique({
        where: { id: cargoId },
        include: {
          aplicaciones: {
            include: { pago: { select: { id: true, propietarioId: true, fechaPago: true } } },
          },
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

      const concepto = await tx.conceptoCobro.findUnique({
        where: { id: input.conceptoCobroId },
      });
      if (!concepto) throw new Error("Concepto de cobro no válido");

      let aplicado = cargo.aplicaciones.reduce(
        (acc, a) => acc.plus(a.montoAplicado),
        ZERO,
      );

      // Bajar la cuota por debajo de lo pagado: se recorta desde lo último.
      const excedente = aplicado.minus(monto);
      const soltado: { pagoId: string; monto: string }[] = [];
      if (excedente.gt(ZERO)) {
        const recientesPrimero = [...cargo.aplicaciones].sort(
          (a, b) =>
            b.pago.fechaPago.getTime() - a.pago.fechaPago.getTime() ||
            b.aplicadoAt.getTime() - a.aplicadoAt.getTime(),
        );
        let porSoltar = excedente;
        for (const ap of recientesPrimero) {
          if (porSoltar.lte(ZERO)) break;
          const actual = new Prisma.Decimal(ap.montoAplicado);
          const quita = porSoltar.lt(actual) ? porSoltar : actual;

          if (quita.eq(actual)) {
            await tx.aplicacionPago.delete({ where: { id: ap.id } });
          } else {
            await tx.aplicacionPago.update({
              where: { id: ap.id },
              data: { montoAplicado: actual.minus(quita) },
            });
          }

          const saldo = await tx.saldoFavor.upsert({
            where: { propietarioId: ap.pago.propietarioId },
            create: { propietarioId: ap.pago.propietarioId, montoDisponible: quita },
            update: { montoDisponible: { increment: quita } },
          });
          await tx.saldoFavorMovimiento.create({
            data: {
              saldoFavorId: saldo.id,
              pagoId: ap.pagoId,
              cargoId,
              monto: quita,
              signo: 1,
            },
          });

          soltado.push({ pagoId: ap.pagoId, monto: quita.toString() });
          porSoltar = porSoltar.minus(quita);
        }
        aplicado = monto;

        // El recibo guarda en texto los meses que cubre: si un pago dejó de
        // cubrir esta cuota, ese mes sale de su detalle.
        for (const pagoId of new Set(soltado.map((s) => s.pagoId))) {
          const restantes = await tx.aplicacionPago.findMany({
            where: { pagoId },
            include: { cargo: { select: { periodo: true, fechaVencimiento: true } } },
          });
          const periodos = restantes
            .filter((r) => r.cargo.periodo)
            .sort((a, b) => a.cargo.fechaVencimiento.getTime() - b.cargo.fechaVencimiento.getTime())
            .map((r) => r.cargo.periodo!.toISOString().slice(0, 7));
          await tx.reciboCaja.updateMany({
            where: { pagoId },
            data: { detallePeriodos: periodos.length ? periodos.join(", ") : null },
          });
        }
      }

      const estado = aplicado.lte(ZERO)
        ? "PENDIENTE"
        : aplicado.gte(monto)
          ? "PAGADO"
          : "PARCIAL";
      const descripcion = input.descripcion.trim() || concepto.nombre;

      await tx.cargo.update({
        where: { id: cargoId },
        data: { monto, conceptoCobroId: concepto.id, descripcion, estado },
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
            descripcion,
            estado,
            ...(soltado.length ? { aSaldoFavor: soltado } : {}),
          },
        },
        tx,
      );

      return {
        codigoUnidad: cargo.unidad.codigo,
        estado,
        devuelto: excedente.gt(ZERO) ? excedente.toNumber() : 0,
      };
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

/** Texto de confirmación tras editar una cuota, para las pantallas que lo usan. */
export function mensajeCuotaEditada(res: EditarCargoResultado): string {
  const base = `Cuota actualizada (${res.estado})`;
  return res.devuelto > 0
    ? `${base}. S/ ${res.devuelto.toFixed(2)} pagados de más pasaron a saldo a favor`
    : base;
}
