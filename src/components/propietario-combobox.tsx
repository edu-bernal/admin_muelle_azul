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

/**
 * Deja el texto comparable: sin tildes y en minúsculas. El padrón guarda los
 * nombres tal como vinieron ("García", "Muñoz") y nadie escribe las tildes al
 * buscar.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function PropietarioCombobox({
  propietarios,
  name = "propietarioId",
  label = "Propietario",
  defaultSelectedId = "",
  onChange,
  required = true,
}: {
  propietarios: PropietarioOption[];
  name?: string;
  label?: string;
  defaultSelectedId?: string;
  /** Avisa del propietario elegido ("" al limpiar la búsqueda). */
  onChange?: (propietarioId: string) => void;
  /** false donde el propietario es opcional, como el alta de personal. */
  required?: boolean;
}) {
  const inicial = defaultSelectedId
    ? propietarios.find((p) => p.id === defaultSelectedId)
    : undefined;
  const [query, setQuery] = useState(inicial ? etiqueta(inicial) : "");
  const [selectedId, setSelectedId] = useState(inicial?.id ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    // Cada palabra buscada debe aparecer en el nombre o en alguna propiedad,
    // sin importar el orden: "garcia fernando" encuentra a "Fernando García",
    // y "garcia c_6" acota al que además tiene esa propiedad.
    const palabras = normalizar(query).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return propietarios
      .filter((p) => {
        const texto = normalizar(`${p.nombre} ${p.unidades.join(" ")}`);
        return palabras.every((w) => texto.includes(w));
      })
      .slice(0, 15);
  }, [query, propietarios]);

  // El valor que viaja al servidor es el id oculto, no lo escrito. Sin esta
  // comprobación, teclear un nombre sin elegirlo de la lista enviaba el
  // formulario vacío y el error aparecía recién en el servidor.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const falta = required ? !selectedId : Boolean(query.trim()) && !selectedId;
    el.setCustomValidity(
      falta ? "Elige un propietario de la lista de sugerencias." : "",
    );
  }, [selectedId, query, required]);

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
    onChange?.(p.id);
  }

  const inputId = `${name}-buscador`;

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        autoComplete="off"
        required={required}
        placeholder="Busca por nombre, apellido o N° de propiedad…"
        className={inputClass}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selectedId) onChange?.("");
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
