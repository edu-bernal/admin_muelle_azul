"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { confirmarConciliadoAction } from "./actions";

interface PagoPend {
  id: string;
  propietario: string;
  monto: number;
  medio: string;
  numeroOperacion: string | null;
  fecha: string;
}

function formatPEN(n: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
}

export function ConciliacionClient({ pagos }: { pagos: PagoPend[] }) {
  const [texto, setTexto] = useState("");

  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  function matches(p: PagoPend): boolean {
    if (lineas.length === 0) return false;
    return lineas.some((linea) => {
      const l = linea.toLowerCase();
      if (p.numeroOperacion && l.includes(p.numeroOperacion.toLowerCase())) return true;
      const montoStr = p.monto.toFixed(2);
      const montoInt = String(Math.round(p.monto));
      return l.includes(montoStr) || l.includes(montoInt);
    });
  }

  const conciliables = pagos.filter(matches);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className={labelClass} htmlFor="extracto">
          Pega aquí el extracto bancario (una línea por movimiento; se cruza por n° de
          operación o monto)
        </label>
        <textarea
          id="extracto"
          rows={6}
          className={inputClass}
          placeholder={"03/07/2026;OP 000123;150.00\n03/07/2026;OP 000124;300.00"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <p className="mt-2 text-sm text-slate-500">
          {lineas.length} líneas · {conciliables.length} pagos coinciden
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Propietario</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Medio</th>
              <th className="px-4 py-3">Operación</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Conciliación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagos.map((p) => {
              const m = matches(p);
              return (
                <tr key={p.id} className={m ? "bg-emerald-50/50" : ""}>
                  <td className="px-4 py-3 font-medium">{p.propietario}</td>
                  <td className="px-4 py-3 text-slate-500">{p.fecha}</td>
                  <td className="px-4 py-3 text-slate-500">{p.medio}</td>
                  <td className="px-4 py-3 text-slate-500">{p.numeroOperacion ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{formatPEN(p.monto)}</td>
                  <td className="px-4 py-3">
                    {m ? (
                      <form action={confirmarConciliadoAction}>
                        <input type="hidden" name="pagoId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          ✓ Coincide — confirmar
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">Sin coincidencia</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay pagos por validar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Al confirmar, el pago se aplica a los cargos (FIFO) y se emite el recibo,
        igual que en la validación manual.
      </p>
    </div>
  );
}
