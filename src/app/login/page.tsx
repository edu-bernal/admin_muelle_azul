import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ROLES_ADMIN, type RolCodigo } from "@/lib/rbac";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { loginAction } from "./actions";

const mensajes: Record<string, string> = {
  campos: "Ingresa tu correo y contraseña.",
  credenciales: "Correo o contraseña incorrectos.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(
      ROLES_ADMIN.includes(session.rol as RolCodigo) ? "/dashboard" : "/portal",
    );
  }
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl">
            🌊
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Muelle Azul</h1>
          <p className="text-sm text-slate-500">Administración del condominio</p>
        </div>

        <form
          action={loginAction}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {mensajes[error] ?? "Ocurrió un error."}
            </p>
          )}
          <div>
            <label className={labelClass} htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={`${buttonClass()} w-full`}>
            Ingresar
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Condominio de playa Muelle Azul · Perú
        </p>
      </div>
    </div>
  );
}
