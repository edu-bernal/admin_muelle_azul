import { requireAdmin, can } from "@/lib/auth";
import { NavLink } from "@/components/nav";
import { logoutAction } from "@/app/login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg">
            🌊
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Muelle Azul</p>
            <p className="text-xs text-slate-400">Administración</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink href="/dashboard" icon="📊">Dashboard</NavLink>
          <NavLink href="/propietarios" icon="👤">Propietarios</NavLink>
          <NavLink href="/unidades" icon="🏠">Propiedades</NavLink>
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Finanzas
          </p>
          <NavLink href="/finanzas/emision" icon="🧾">Emisión de cuotas</NavLink>
          <NavLink href="/finanzas/pagos" icon="💵">Pagos</NavLink>
          <NavLink href="/finanzas/estados-cuenta" icon="📄">Estados de cuenta</NavLink>
          <NavLink href="/finanzas/morosidad" icon="⏰">Morosidad</NavLink>
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Operación
          </p>
          <NavLink href="/comunicados" icon="📣">Comunicados</NavLink>
          <NavLink href="/reservas" icon="🏖️">Reservas</NavLink>
          <NavLink href="/incidencias" icon="🛠️">Incidencias</NavLink>
          <NavLink href="/multas" icon="⚠️">Multas</NavLink>
          {can(user, "proveedores.gestionar") && (
            <>
              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Egresos
              </p>
              <NavLink href="/proveedores" icon="🏢">Proveedores</NavLink>
              <NavLink href="/planillas" icon="👷">Planillas</NavLink>
            </>
          )}
        </nav>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="px-2 text-sm font-medium text-slate-700">{user.nombre}</p>
          <p className="px-2 text-xs text-slate-400">{user.rol}</p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
            >
              ↩ Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}
