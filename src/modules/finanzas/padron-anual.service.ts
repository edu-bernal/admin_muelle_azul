import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Padrón general con abonos: una fila por propiedad y una columna por mes con
 * lo abonado a la cuota de ese mes, más una columna para las cuotas
 * extraordinarias del año. Reproduce la planilla que la administración lleva
 * en Excel.
 *
 * El mes de cada abono es el del CARGO que cubre, no el de la fecha en que
 * entró el dinero: así la fila cuadra con lo que se debía mes a mes, que es
 * como se lee la planilla.
 */
export interface FilaPadronAnual {
  numero: number;
  sector: string;
  manzana: string;
  lote: string;
  codigoCorto: string;
  codigo: string;
  tipo: string;
  propietario1: string;
  propietario2: string;
  /** Doce importes, de enero a diciembre. */
  meses: number[];
  extraordinaria: number;
  total: number;
}

export interface PadronAnual {
  anio: number;
  filas: FilaPadronAnual[];
  totalesMes: number[];
  totalExtraordinaria: number;
  total: number;
  /** Lo emitido en el año, para contrastar con lo cobrado. */
  totalEmitido: number;
}

export const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Oct",
  "Nov",
  "Dic",
] as const;

export async function padronAnual(anio: number): Promise<PadronAnual> {
  const desde = new Date(Date.UTC(anio, 0, 1));
  const hasta = new Date(Date.UTC(anio + 1, 0, 1));

  const [unidades, aplicaciones, emitido] = await Promise.all([
    // Las cocheras (y cualquier tipo que no genere cuota) quedan fuera: no se
    // les emite nada, así que una fila entera de ceros solo se leería como
    // moroso. El padrón de abonos es de lo que se cobra.
    prisma.unidad.findMany({
      where: { activo: true, tipo: { generaCuota: true } },
      orderBy: { codigo: "asc" },
      select: {
        id: true,
        codigo: true,
        manzana: true,
        lote: true,
        sector: { select: { codigo: true } },
        tipo: { select: { nombre: true } },
        titularidades: {
          where: { fechaFin: null },
          orderBy: [{ esResponsablePago: "desc" }, { fechaInicio: "asc" }],
          select: { propietario: { select: { nombre: true } } },
        },
      },
    }),
    prisma.aplicacionPago.findMany({
      where: {
        cargo: { periodo: { gte: desde, lt: hasta }, estado: { not: "ANULADO" } },
        pago: { estado: "CONFIRMADO" },
      },
      select: {
        montoAplicado: true,
        cargo: {
          select: {
            unidadId: true,
            periodo: true,
            conceptoCobro: { select: { codigo: true } },
          },
        },
      },
    }),
    prisma.cargo.aggregate({
      where: { periodo: { gte: desde, lt: hasta }, estado: { not: "ANULADO" } },
      _sum: { monto: true },
    }),
  ]);

  const vacio = () => ({ meses: Array<number>(12).fill(0), extra: 0 });
  const porUnidad = new Map<string, ReturnType<typeof vacio>>();

  for (const a of aplicaciones) {
    const acc = porUnidad.get(a.cargo.unidadId) ?? vacio();
    const monto = new Prisma.Decimal(a.montoAplicado).toNumber();
    if (a.cargo.conceptoCobro.codigo === "MANT") {
      acc.meses[a.cargo.periodo!.getUTCMonth()] += monto;
    } else {
      acc.extra += monto;
    }
    porUnidad.set(a.cargo.unidadId, acc);
  }

  const totalesMes = Array<number>(12).fill(0);
  let totalExtraordinaria = 0;

  const filas = unidades.map((u, i): FilaPadronAnual => {
    const datos = porUnidad.get(u.id) ?? vacio();
    datos.meses.forEach((m, k) => (totalesMes[k] += m));
    totalExtraordinaria += datos.extra;

    const titulares = u.titularidades.map((t) => t.propietario.nombre);
    return {
      numero: i + 1,
      sector: u.sector.codigo,
      manzana: u.manzana,
      lote: u.lote,
      // El código sin el sector es el "M&L" de la planilla.
      codigoCorto: u.codigo.split("-").slice(1).join("-"),
      codigo: u.codigo,
      tipo: u.tipo.nombre,
      propietario1: titulares[0] ?? "",
      propietario2: titulares[1] ?? "",
      meses: datos.meses,
      extraordinaria: datos.extra,
      total: datos.meses.reduce((a, b) => a + b, 0) + datos.extra,
    };
  });

  return {
    anio,
    filas,
    totalesMes,
    totalExtraordinaria,
    total: totalesMes.reduce((a, b) => a + b, 0) + totalExtraordinaria,
    totalEmitido: emitido._sum.monto ? new Prisma.Decimal(emitido._sum.monto).toNumber() : 0,
  };
}

/** Años con movimiento, del más reciente al más antiguo, para el selector. */
export async function aniosConDatos(): Promise<number[]> {
  const filas = await prisma.$queryRaw<{ anio: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM "periodo")::int AS anio
    FROM "Cargo"
    WHERE "periodo" IS NOT NULL
    ORDER BY anio DESC
  `;
  const anios = filas.map((f) => f.anio);
  const actual = new Date().getUTCFullYear();
  return anios.includes(actual) ? anios : [actual, ...anios];
}
