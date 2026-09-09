import { prisma } from "@/lib/prisma";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { Logo } from "@/components/logo";
import { activarCuentaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ActivarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const usuario = await prisma.usuario.findUnique({
    where: { activationToken: token },
    select: {
      nombreCompleto: true,
      email: true,
      estado: true,
      activationExpires: true,
    },
  });

  const caducado =
    !!usuario?.activationExpires && usuario.activationExpires < new Date();
  const valido = !!usuario && !caducado && usuario.estado !== "SUSPENDIDO";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo size={56} className="mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-900">Muelle Azul</h1>
          <p className="text-sm text-slate-500">Activa tu acceso</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!valido ? (
            <>
              <p className="text-sm text-slate-700">
                {caducado
                  ? "Este enlace de invitación ya caducó."
                  : "Este enlace no es válido o ya fue utilizado."}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Pide uno nuevo a la administración del condominio.
              </p>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Hola <strong>{usuario.nombreCompleto}</strong>. Establece la
                contraseña con la que entrarás a <strong>{usuario.email}</strong>.
              </p>

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <form action={activarCuentaAction} className="space-y-4">
                <input type="hidden" name="token" value={token} />
                <div>
                  <label className={labelClass} htmlFor="password">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="confirmacion">
                    Repite la contraseña
                  </label>
                  <input
                    id="confirmacion"
                    name="confirmacion"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className={`${buttonClass()} w-full`}>
                  Activar mi acceso
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Condominio de playa Muelle Azul · Perú
        </p>
      </div>
    </div>
  );
}
