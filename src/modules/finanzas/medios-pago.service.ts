import { prisma } from "@/lib/prisma";

export interface MedioPagoOpcion {
  codigo: string;
  nombre: string;
}

/**
 * Medios que se ofrecen en los formularios de pago, en el orden del maestro.
 * Los de sistema (pasarela, migración) nunca se ofrecen: los asigna el propio
 * sistema. Con `portal` se limitan a los que el propietario puede declarar.
 */
export async function mediosPagoSeleccionables(
  opciones: { portal?: boolean } = {},
): Promise<MedioPagoOpcion[]> {
  return prisma.medioPago.findMany({
    where: {
      activo: true,
      sistema: false,
      ...(opciones.portal ? { portal: true } : {}),
    },
    select: { codigo: true, nombre: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

/** true si el código es un medio que ese formulario puede recibir. */
export async function esMedioSeleccionable(
  codigo: string,
  opciones: { portal?: boolean } = {},
): Promise<boolean> {
  if (!codigo) return false;
  const medio = await prisma.medioPago.findUnique({ where: { codigo } });
  return Boolean(
    medio && medio.activo && !medio.sistema && (!opciones.portal || medio.portal),
  );
}

/** Código → nombre de todos los medios, incluidos los inactivos y de sistema. */
export async function nombresMediosPago(): Promise<Map<string, string>> {
  const medios = await prisma.medioPago.findMany({
    select: { codigo: true, nombre: true },
  });
  return new Map(medios.map((m) => [m.codigo, m.nombre]));
}
