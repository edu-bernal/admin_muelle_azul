import { Prisma } from "@prisma/client";

export type Decimalish = Prisma.Decimal | number | string;

/** Crea un Decimal a partir de number/string/Decimal. */
export function dec(value: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export const ZERO = new Prisma.Decimal(0);

/** Formatea un monto en soles peruanos: 1234.5 -> "S/ 1,234.50". */
export function formatPEN(value: Decimalish): string {
  const n = new Prisma.Decimal(value).toNumber();
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Convierte un Decimal a number seguro para serializar hacia el cliente. */
export function toNumber(value: Decimalish | null | undefined): number {
  if (value == null) return 0;
  return new Prisma.Decimal(value).toNumber();
}

/** Suma una lista de montos con precisión decimal. */
export function sum(values: Decimalish[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(new Prisma.Decimal(v)),
    ZERO,
  );
}
