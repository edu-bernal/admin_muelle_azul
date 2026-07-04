import {
  PageHeader,
  Card,
  inputClass,
  labelClass,
  buttonClass,
  LinkButton,
} from "@/components/ui";
import { crearPropietario } from "../actions";

export default async function NuevoPropietarioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader title="Nuevo propietario" />
      <Card>
        <form action={crearPropietario} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Revisa los datos ingresados.
            </p>
          )}
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre completo / Razón social *
            </label>
            <input id="nombre" name="nombre" required className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="tipoDocumento">
                Tipo de documento
              </label>
              <select id="tipoDocumento" name="tipoDocumento" className={inputClass}>
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
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="email">
                Correo electrónico
              </label>
              <input id="email" name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="telefono">
                Teléfono
              </label>
              <input id="telefono" name="telefono" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="canalEnvio">
              Canal de envío preferido
            </label>
            <select id="canalEnvio" name="canalEnvio" className={inputClass}>
              <option value="CORREO">Correo</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className={buttonClass()}>
              Guardar
            </button>
            <LinkButton href="/propietarios" variant="ghost">
              Cancelar
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
