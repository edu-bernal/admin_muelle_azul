import { inputClass, labelClass, buttonClass, LinkButton } from "@/components/ui";

export interface PropietarioFormValues {
  id?: string;
  nombre?: string;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  email?: string | null;
  emailSecundario?: string | null;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  canalEnvio?: string;
  direccionHabitual?: string | null;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

export function PropietarioForm({
  action,
  defaultValues = {},
  submitLabel = "Guardar",
  cancelHref = "/propietarios",
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: PropietarioFormValues;
  submitLabel?: string;
  cancelHref?: string;
  error?: string;
}) {
  const d = defaultValues;

  return (
    <form action={action} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {d.id && <input type="hidden" name="id" value={d.id} />}

      <div>
        <label className={labelClass} htmlFor="nombre">
          Nombre completo / Razón social *
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          defaultValue={d.nombre}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="tipoDocumento">
            Tipo de documento
          </label>
          <select
            id="tipoDocumento"
            name="tipoDocumento"
            defaultValue={d.tipoDocumento ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="DNI">DNI</option>
            <option value="CE">CE</option>
            <option value="RUC">RUC</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="numeroDocumento">
            Número
          </label>
          <input
            id="numeroDocumento"
            name="numeroDocumento"
            defaultValue={d.numeroDocumento ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Contacto principal
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={d.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            defaultValue={d.telefono ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Contacto secundario
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="emailSecundario">
            Correo secundario
          </label>
          <input
            id="emailSecundario"
            name="emailSecundario"
            type="email"
            defaultValue={d.emailSecundario ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="telefonoSecundario">
            Teléfono secundario
          </label>
          <input
            id="telefonoSecundario"
            name="telefonoSecundario"
            defaultValue={d.telefonoSecundario ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="canalEnvio">
          Canal de envío preferido
        </label>
        <select
          id="canalEnvio"
          name="canalEnvio"
          defaultValue={d.canalEnvio ?? "CORREO"}
          className={inputClass}
        >
          <option value="CORREO">Correo</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="direccionHabitual">
          Dirección de residencia habitual
        </label>
        <input
          id="direccionHabitual"
          name="direccionHabitual"
          placeholder="Los propietarios de playa suelen residir fuera del condominio"
          defaultValue={d.direccionHabitual ?? ""}
          className={inputClass}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Contacto de emergencia
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="contactoEmergenciaNombre">
            Nombre
          </label>
          <input
            id="contactoEmergenciaNombre"
            name="contactoEmergenciaNombre"
            defaultValue={d.contactoEmergenciaNombre ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactoEmergenciaTelefono">
            Teléfono
          </label>
          <input
            id="contactoEmergenciaTelefono"
            name="contactoEmergenciaTelefono"
            defaultValue={d.contactoEmergenciaTelefono ?? ""}
            className={inputClass}
          />
        </div>
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
