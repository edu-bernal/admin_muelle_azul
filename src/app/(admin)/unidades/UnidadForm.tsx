import { inputClass, labelClass, buttonClass, LinkButton } from "@/components/ui";

export interface UnidadFormValues {
  id?: string;
  sectorId?: string;
  manzana?: string;
  lote?: string;
  tipo?: string;
  areaM2?: string;
  alicuota?: string;
  baseCalculoCuota?: string | null;
  montoFijoCuota?: string;
  estadoOcupacion?: string;
  unidadPrincipalId?: string | null;
}

export interface SectorOption {
  id: string;
  codigo: string;
  nombre: string;
}

export interface UnidadPrincipalOption {
  id: string;
  codigo: string;
}

export function UnidadForm({
  action,
  defaultValues = {},
  sectores,
  unidadesPrincipales,
  codigoActual,
  submitLabel = "Guardar",
  cancelHref = "/unidades",
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: UnidadFormValues;
  sectores: SectorOption[];
  unidadesPrincipales: UnidadPrincipalOption[];
  codigoActual?: string;
  submitLabel?: string;
  cancelHref?: string;
  error?: string;
}) {
  const d = defaultValues;
  const esEdicion = !!d.id;

  return (
    <form action={action} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {d.id && <input type="hidden" name="id" value={d.id} />}

      {esEdicion && codigoActual && (
        <div>
          <label className={labelClass}>Código de unidad</label>
          <div className={`${inputClass} bg-slate-50 text-slate-500`}>{codigoActual}</div>
          <p className="mt-1 text-xs text-slate-400">
            El código es inmutable una vez creada la unidad.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor="sectorId">
            Sector *
          </label>
          <select
            id="sectorId"
            name="sectorId"
            required
            defaultValue={d.sectorId ?? ""}
            className={inputClass}
            disabled={esEdicion}
          >
            <option value="">Selecciona…</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.codigo})
              </option>
            ))}
          </select>
          {esEdicion && <input type="hidden" name="sectorId" value={d.sectorId} />}
        </div>
        <div>
          <label className={labelClass} htmlFor="manzana">
            Manzana *
          </label>
          <input
            id="manzana"
            name="manzana"
            required
            defaultValue={d.manzana ?? ""}
            className={inputClass}
            disabled={esEdicion}
          />
          {esEdicion && <input type="hidden" name="manzana" value={d.manzana} />}
        </div>
        <div>
          <label className={labelClass} htmlFor="lote">
            Lote *
          </label>
          <input
            id="lote"
            name="lote"
            required
            defaultValue={d.lote ?? ""}
            className={inputClass}
            disabled={esEdicion}
          />
          {esEdicion && <input type="hidden" name="lote" value={d.lote} />}
        </div>
      </div>
      {esEdicion && (
        <p className="text-xs text-slate-400">
          Sector, manzana y lote no se pueden editar (determinan el código de la unidad).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={d.tipo ?? "CASA"} className={inputClass}>
            <option value="CASA">Casa</option>
            <option value="TERRENO">Terreno sin construir</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="estadoOcupacion">
            Estado de ocupación
          </label>
          <select
            id="estadoOcupacion"
            name="estadoOcupacion"
            defaultValue={d.estadoOcupacion ?? "PROPIETARIO"}
            className={inputClass}
          >
            <option value="PROPIETARIO">Ocupada por propietario</option>
            <option value="ALQUILADA">Alquilada</option>
            <option value="DESOCUPADA">Desocupada</option>
            <option value="EN_VENTA">En venta</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Cálculo de cuota
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor="areaM2">
            Área (m²)
          </label>
          <input
            id="areaM2"
            name="areaM2"
            type="number"
            step="0.01"
            defaultValue={d.areaM2 ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="alicuota">
            Alícuota (%)
          </label>
          <input
            id="alicuota"
            name="alicuota"
            type="number"
            step="0.0001"
            defaultValue={d.alicuota ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="baseCalculoCuota">
            Base de cálculo
          </label>
          <select
            id="baseCalculoCuota"
            name="baseCalculoCuota"
            defaultValue={d.baseCalculoCuota ?? ""}
            className={inputClass}
          >
            <option value="">Usar la global</option>
            <option value="ALICUOTA">Por alícuota</option>
            <option value="FIJO">Monto fijo</option>
            <option value="M2">Por m²</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="montoFijoCuota">
          Monto fijo de cuota (S/) — solo si la base es &quot;Monto fijo&quot;
        </label>
        <input
          id="montoFijoCuota"
          name="montoFijoCuota"
          type="number"
          step="0.01"
          defaultValue={d.montoFijoCuota ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="unidadPrincipalId">
          Unidad principal (opcional)
        </label>
        <select
          id="unidadPrincipalId"
          name="unidadPrincipalId"
          defaultValue={d.unidadPrincipalId ?? ""}
          className={inputClass}
        >
          <option value="">Ninguna — es una unidad independiente</option>
          {unidadesPrincipales
            .filter((u) => u.id !== d.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Úsalo para agrupar una cochera o depósito bajo la casa principal (cobro consolidado).
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className={buttonClass()}>
          {submitLabel}
        </button>
        <LinkButton href={cancelHref} variant="ghost">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
