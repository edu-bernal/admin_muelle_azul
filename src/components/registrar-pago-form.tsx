"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PropietarioCombobox,
  type PropietarioOption,
} from "@/components/propietario-combobox";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { ACCEPT_COMPROBANTE } from "@/lib/comprobantes";
import type { CargoPendiente } from "@/modules/finanzas/cargos-pendientes.service";

const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

/**
 * Formulario de registro de pago. Al elegir propietario trae su deuda
 * pendiente para marcarla y calcular el monto.
 *
 * Los cargos llegan en el mismo orden en que `aplicarPagoFIFO` los cubrirá,
 * así que marcar desde arriba refleja exactamente lo que ocurrirá. Si se
 * saltan cargos más antiguos se avisa, porque el pago igual empezará por
 * ellos.
 */
export function RegistrarPagoForm({
  propietarios,
  accion,
  hoy,
}: {
  propietarios: PropietarioOption[];
  accion: (formData: FormData) => void;
  hoy: string;
}) {
  const [cargos, setCargos] = useState<CargoPendiente[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [monto, setMonto] = useState("");
  const [propietarioId, setPropietarioId] = useState("");

  const alCambiarPropietario = useCallback((id: string) => {
    setPropietarioId(id);
    setMarcados(new Set());
    setMonto("");
    setCargos([]);
    // El indicador se enciende aquí, no dentro del efecto: la carga arranca
    // por esta interacción y así se evita un render en cascada.
    setCargando(Boolean(id));
  }, []);

  useEffect(() => {
    if (!propietarioId) return;
    let vigente = true;
    fetch(`/api/propietarios/${propietarioId}/cargos-pendientes`)
      .then((r) => (r.ok ? r.json() : { cargos: [] }))
      .then((d) => {
        if (vigente) setCargos(d.cargos ?? []);
      })
      .catch(() => {
        if (vigente) setCargos([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [propietarioId]);

  function alternar(cargoId: string) {
    const siguiente = new Set(marcados);
    if (siguiente.has(cargoId)) siguiente.delete(cargoId);
    else siguiente.add(cargoId);
    setMarcados(siguiente);

    const suma = cargos
      .filter((c) => siguiente.has(c.cargoId))
      .reduce((acc, c) => acc + c.saldo, 0);
    setMonto(siguiente.size ? suma.toFixed(2) : "");
  }

  function marcarTodos() {
    setMarcados(new Set(cargos.map((c) => c.cargoId)));
    setMonto(cargos.reduce((a, c) => a + c.saldo, 0).toFixed(2));
  }

  const totalDeuda = cargos.reduce((a, c) => a + c.saldo, 0);
  const indiceUltimoMarcado = cargos.reduce(
    (ultimo, c, i) => (marcados.has(c.cargoId) ? i : ultimo),
    -1,
  );
  // Quedó un cargo más antiguo sin marcar por encima del último marcado.
  const salteaAntiguos = cargos.some(
    (c, i) => i < indiceUltimoMarcado && !marcados.has(c.cargoId),
  );

  return (
    <form action={accion} className="space-y-3">
      <PropietarioCombobox
        propietarios={propietarios}
        onChange={alCambiarPropietario}
      />

      {propietarioId && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">
              Deuda pendiente
              {!cargando && cargos.length > 0 && (
                <span className="ml-2 font-normal text-slate-500">
                  {cargos.length} cargo{cargos.length === 1 ? "" : "s"} ·{" "}
                  {PEN.format(totalDeuda)}
                </span>
              )}
            </span>
            {cargos.length > 0 && (
              <button
                type="button"
                onClick={marcarTodos}
                className="text-xs text-brand hover:underline"
              >
                Marcar todo
              </button>
            )}
          </div>

          {cargando ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : cargos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Sin deuda pendiente. El pago quedará como saldo a favor.
            </p>
          ) : (
            <>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {cargos.map((c) => (
                  <li key={c.cargoId}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-white">
                      <input
                        type="checkbox"
                        checked={marcados.has(c.cargoId)}
                        onChange={() => alternar(c.cargoId)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="flex-1 truncate text-slate-700">
                        {c.descripcion}
                        <span className="ml-1 text-xs text-slate-400">
                          {c.unidadCodigo} · vence {c.fechaVencimiento}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {PEN.format(c.saldo)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {salteaAntiguos && (
                <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                  Dejaste cargos más antiguos sin marcar. El pago se aplica
                  siempre empezando por el más antiguo, así que cubrirá esos
                  primero.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="monto">
            Monto (S/)
          </label>
          <input
            id="monto"
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fecha">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="medio">
            Medio
          </label>
          <select id="medio" name="medio" className={inputClass}>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="DEPOSITO">Depósito BBVA</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="numeroOperacion">
            N° operación
          </label>
          <input
            id="numeroOperacion"
            name="numeroOperacion"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="comprobante">
          Comprobante (opcional)
        </label>
        <input
          id="comprobante"
          name="comprobante"
          type="file"
          accept={ACCEPT_COMPROBANTE}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <p className="mt-1 text-xs text-slate-400">
          Imagen o PDF del voucher, hasta 8 MB.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        El pago se aplica automáticamente a los cargos más antiguos (FIFO) y
        genera un recibo de caja.
      </p>
      <button type="submit" className={buttonClass()}>
        Registrar y aplicar
      </button>
    </form>
  );
}
