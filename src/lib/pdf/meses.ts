export const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function mesTexto(fecha: Date): string {
  return MESES_ES[fecha.getUTCMonth()];
}

export function fechaCorta(fecha: Date): string {
  const d = fecha.getUTCDate();
  const m = fecha.getUTCMonth() + 1;
  const y = fecha.getUTCFullYear();
  return `${d}/${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Convierte una lista de períodos "YYYY-MM" (como se guardan en
 * ReciboCaja.detallePeriodos) a un texto legible agrupado por año,
 * ej. "2026: Julio, Agosto" — imitando el formato real de los recibos
 * históricos del condominio.
 */
export function formatearPeriodosLegible(detalle: string | null): string | null {
  if (!detalle) return null;
  const tokens = detalle
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const porAnio = new Map<string, string[]>();
  for (const t of tokens) {
    const match = /^(\d{4})-(\d{2})$/.exec(t);
    if (!match) continue;
    const [, anio, mes] = match;
    const nombreMes = MESES_ES[Number(mes) - 1] ?? mes;
    if (!porAnio.has(anio)) porAnio.set(anio, []);
    porAnio.get(anio)!.push(nombreMes);
  }
  if (porAnio.size === 0) return detalle;
  return [...porAnio.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anio, meses]) => `${anio}: ${meses.join(", ")}`)
    .join("; ");
}
