"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Ancho mínimo al que se puede encoger una columna arrastrando. */
const MIN_PX = 60;

/**
 * Tabla con columnas de ancho ajustable arrastrando el borde del encabezado.
 * Los anchos se guardan por pantalla en localStorage, así el ajuste sobrevive
 * a recargas y a cambios de página del listado.
 *
 * Las manijas se dibujan en una capa superpuesta en vez de inyectarse dentro
 * de cada <th>: el encabezado llega como prop desde un Server Component y a
 * través de esa frontera no siempre es un elemento clonable.
 */
export function TablaRedimensionable({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  const tablaRef = useRef<HTMLTableElement>(null);
  const pathname = usePathname();
  const [anchos, setAnchos] = useState<number[] | null>(null);
  const [altoEncabezado, setAltoEncabezado] = useState(0);

  const claveDe = useCallback(
    (n: number) => `muelle:anchos:${pathname}:${n}`,
    [pathname],
  );

  // Mide los anchos actuales al montar (y tras restablecer), o recupera los
  // guardados. Medir primero evita que la tabla "salte" al fijar el layout.
  useEffect(() => {
    if (anchos !== null) return;
    const tabla = tablaRef.current;
    if (!tabla) return;
    const ths = Array.from(tabla.querySelectorAll("thead th"));
    if (ths.length === 0) return;

    const thead = tabla.querySelector("thead");
    setAltoEncabezado(thead?.getBoundingClientRect().height ?? 0);

    let guardados: number[] | null = null;
    try {
      const crudo = localStorage.getItem(claveDe(ths.length));
      const parsed = crudo ? JSON.parse(crudo) : null;
      if (
        Array.isArray(parsed) &&
        parsed.length === ths.length &&
        parsed.every((n) => typeof n === "number" && n > 0)
      ) {
        guardados = parsed;
      }
    } catch {
      guardados = null;
    }

    setAnchos(
      guardados ?? ths.map((th) => Math.round(th.getBoundingClientRect().width)),
    );
  }, [anchos, claveDe]);

  const restablecer = useCallback(() => {
    const n = anchos?.length ?? 0;
    try {
      if (n) localStorage.removeItem(claveDe(n));
    } catch {
      /* localStorage puede estar bloqueado; el reset visual igual ocurre */
    }
    setAnchos(null);
  }, [anchos, claveDe]);

  const iniciarArrastre = useCallback(
    (indice: number, clientX: number) => {
      if (!anchos) return;
      const base = [...anchos];
      const inicioX = clientX;

      const mover = (e: MouseEvent) => {
        const siguiente = [...base];
        siguiente[indice] = Math.max(MIN_PX, base[indice] + e.clientX - inicioX);
        setAnchos(siguiente);
      };
      const soltar = () => {
        document.removeEventListener("mousemove", mover);
        document.removeEventListener("mouseup", soltar);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setAnchos((actuales) => {
          if (actuales) {
            try {
              localStorage.setItem(
                claveDe(actuales.length),
                JSON.stringify(actuales),
              );
            } catch {
              /* sin persistencia, pero el ajuste de esta sesión se conserva */
            }
          }
          return actuales;
        });
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", mover);
      document.addEventListener("mouseup", soltar);
    },
    [anchos, claveDe],
  );

  const total = anchos?.reduce((a, b) => a + b, 0);
  const estiloFijo = anchos ? { tableLayout: "fixed" as const, width: `${total}px` } : undefined;

  // Posición X del borde derecho de cada columna.
  const bordes: number[] = [];
  if (anchos) {
    let acumulado = 0;
    for (const ancho of anchos) {
      acumulado += ancho;
      bordes.push(acumulado);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="relative" style={total ? { width: `${total}px` } : undefined}>
        <table ref={tablaRef} className="w-full text-sm" style={estiloFijo}>
          {anchos && (
            <colgroup>
              {anchos.map((ancho, i) => (
                <col key={i} style={{ width: `${ancho}px` }} />
              ))}
            </colgroup>
          )}
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {head}
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>

        {anchos && altoEncabezado > 0 && (
          <div
            className="pointer-events-none absolute left-0 top-0"
            style={{ height: `${altoEncabezado}px`, width: `${total}px` }}
          >
            {bordes.map((x, i) => (
              <span
                key={i}
                role="separator"
                aria-orientation="vertical"
                aria-label="Ajustar ancho de columna"
                title="Arrastra para ajustar el ancho · doble clic para restablecer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  iniciarArrastre(i, e.clientX);
                }}
                onDoubleClick={restablecer}
                className="pointer-events-auto absolute top-0 h-full w-2 -translate-x-1/2 cursor-col-resize hover:bg-brand/40"
                style={{ left: `${x}px` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
