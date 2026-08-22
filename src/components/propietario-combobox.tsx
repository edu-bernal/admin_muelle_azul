"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass, labelClass } from "@/components/ui";

export type PropietarioOption = {
  id: string;
  nombre: string;
  unidades: string[];
};

function etiqueta(p: PropietarioOption) {
  return p.nombre + (p.unidades.length ? ` — ${p.unidades.join(", ")}` : "");
}

export function PropietarioCombobox({
  propietarios,
  name = "propietarioId",
  label = "Propietario",
  defaultSelectedId = "",
}: {
  propietarios: PropietarioOption[];
  name?: string;
  label?: string;
  defaultSelectedId?: string;
}) {
  const inicial = defaultSelectedId
    ? propietarios.find((p) => p.id === defaultSelectedId)
    : undefined;
  const [query, setQuery] = useState(inicial ? etiqueta(inicial) : "");
  const [selectedId, setSelectedId] = useState(inicial?.id ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return propietarios
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.unidades.some((u) => u.toLowerCase().includes(q)),
      )
      .slice(0, 15);
  }, [query, propietarios]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        if (!selectedId) setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [selectedId]);

  function selectPropietario(p: PropietarioOption) {
    setSelectedId(p.id);
    setQuery(etiqueta(p));
    setOpen(false);
  }

  const inputId = `${name}-buscador`;

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        required
        placeholder="Busca por nombre, apellido o N° de propiedad…"
        className={inputClass}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <input type="hidden" name={name} value={selectedId} />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPropietario(p)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{p.nombre}</span>
                {p.unidades.length > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    {p.unidades.join(", ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
          Sin resultados.
        </div>
      )}
    </div>
  );
}
