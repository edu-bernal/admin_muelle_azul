import Link from "next/link";

/**
 * Navegación entre páginas para los listados largos (padrón de propietarios,
 * unidades). Conserva los filtros activos al cambiar de página.
 */
export function Paginacion({
  pagina,
  porPagina,
  total,
  base,
  params,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  /** Ruta del listado, p. ej. "/propietarios". */
  base: string;
  /** Filtros vigentes que deben sobrevivir al cambio de página. */
  params: Record<string, string | undefined>;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  function href(p: number): string {
    const sp = new URLSearchParams();
    for (const [clave, valor] of Object.entries(params)) {
      if (valor) sp.set(clave, valor);
    }
    if (p > 1) sp.set("pagina", String(p));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const enlaceClass =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        {total === 0
          ? "Sin resultados"
          : `Mostrando ${desde}–${hasta} de ${total}`}
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-2">
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} className={enlaceClass}>
              ← Anterior
            </Link>
          ) : (
            <span className={`${enlaceClass} opacity-40`}>← Anterior</span>
          )}
          <span className="text-sm text-slate-500">
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas ? (
            <Link href={href(pagina + 1)} className={enlaceClass}>
              Siguiente →
            </Link>
          ) : (
            <span className={`${enlaceClass} opacity-40`}>Siguiente →</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Lee y valida el número de página de la URL. */
export function paginaActual(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
