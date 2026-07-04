import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { NavLink } from "@/components/nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg">
              🌊
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Muelle Azul</p>
              <p className="text-xs text-slate-400">Portal del propietario</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user.nombre}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 pb-2">
          <NavLink href="/portal" icon="📄" exact>Mi cuenta</NavLink>
          <NavLink href="/portal/pagar" icon="💳">Pagar</NavLink>
          <NavLink href="/portal/comunicados" icon="📣">Comunicados</NavLink>
          <NavLink href="/portal/reservas" icon="🏖️">Reservas</NavLink>
          <NavLink href="/portal/incidencias" icon="🛠️">Incidencias</NavLink>
          <NavLink href="/portal/votaciones" icon="🗳️">Votaciones</NavLink>
          <NavLink href="/portal/visitas" icon="🚪">Visitas</NavLink>
          <NavLink href="/portal/documentos" icon="📁">Documentos</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
