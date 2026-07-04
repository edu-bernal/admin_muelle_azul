import {
  PageHeader,
  Card,
  inputClass,
  labelClass,
  buttonClass,
  LinkButton,
} from "@/components/ui";
import { crearProveedor } from "../actions";

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-xl">
      <PageHeader title="Nuevo proveedor" />
      <Card>
        <form action={crearProveedor} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Revisa los datos ingresados.
            </p>
          )}
          <div>
            <label className={labelClass} htmlFor="razonSocial">
              Razón social *
            </label>
            <input id="razonSocial" name="razonSocial" required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="ruc">
                RUC
              </label>
              <input id="ruc" name="ruc" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="rubro">
                Rubro
              </label>
              <input
                id="rubro"
                name="rubro"
                placeholder="Jardinería, piscina…"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="contactoNombre">
                Contacto
              </label>
              <input id="contactoNombre" name="contactoNombre" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="contactoTelefono">
                Teléfono
              </label>
              <input id="contactoTelefono" name="contactoTelefono" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className={buttonClass()}>
              Guardar
            </button>
            <LinkButton href="/proveedores" variant="ghost">
              Cancelar
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
