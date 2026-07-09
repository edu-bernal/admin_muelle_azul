import { prisma } from "@/lib/prisma";
import type { ReciboPdfData } from "@/lib/pdf/recibo-document";

export interface ReciboConAcceso {
  data: ReciboPdfData;
  propietarioId: string | null;
}

/**
 * Arma los datos necesarios para renderizar el PDF de un recibo de caja,
 * y devuelve además el propietarioId asociado (para validar el acceso del
 * propietario en el portal — nunca debe ver el recibo de otro).
 */
export async function obtenerDatosRecibo(reciboId: string): Promise<ReciboConAcceso | null> {
  const recibo = await prisma.reciboCaja.findUnique({
    where: { id: reciboId },
    include: {
      pago: {
        include: {
          propietario: true,
          aplicaciones: {
            include: { cargo: { include: { unidad: { include: { sector: true } } } } },
          },
        },
      },
      ingresoVario: {
        include: {
          propietario: true,
          unidad: { include: { sector: true } },
        },
      },
    },
  });
  if (!recibo) return null;

  const condominio = await prisma.condominio.findFirst();
  const nombreCondominio =
    condominio?.nombre ?? "Asociación de Propietarios del Condominio Residencial de Playa Muelle Azul";
  const ruc = condominio?.ruc ?? null;

  if (recibo.pago) {
    const pago = recibo.pago;
    const unidadesMap = new Map<string, ReciboPdfData["unidades"][number]>();
    for (const ap of pago.aplicaciones) {
      const u = ap.cargo.unidad;
      unidadesMap.set(u.id, {
        codigo: u.codigo,
        manzana: u.manzana,
        lote: u.lote,
        sectorNombre: u.sector.nombre,
      });
    }

    const data: ReciboPdfData = {
      numero: recibo.numero,
      serie: recibo.serie,
      emitidoAt: recibo.emitidoAt,
      reimpresiones: recibo.reimpresiones,
      condominio: { nombre: nombreCondominio, ruc },
      importe: Number(pago.monto),
      recibimosDe: pago.propietario.nombre,
      concepto: "Cuota(s) de mantenimiento / cargos del condominio:",
      detallePeriodos: recibo.detallePeriodos,
      unidades: [...unidadesMap.values()],
      fechaPago: pago.fechaPago,
    };
    return { data, propietarioId: pago.propietarioId };
  }

  if (recibo.ingresoVario) {
    const iv = recibo.ingresoVario;
    const data: ReciboPdfData = {
      numero: recibo.numero,
      serie: recibo.serie,
      emitidoAt: recibo.emitidoAt,
      reimpresiones: recibo.reimpresiones,
      condominio: { nombre: nombreCondominio, ruc },
      importe: Number(iv.monto),
      recibimosDe: iv.propietario?.nombre ?? iv.descripcion ?? "Público en general",
      concepto: iv.concepto,
      detallePeriodos: null,
      unidades: iv.unidad
        ? [
            {
              codigo: iv.unidad.codigo,
              manzana: iv.unidad.manzana,
              lote: iv.unidad.lote,
              sectorNombre: iv.unidad.sector.nombre,
            },
          ]
        : [],
      fechaPago: iv.fecha,
    };
    return { data, propietarioId: iv.propietarioId };
  }

  return null;
}
