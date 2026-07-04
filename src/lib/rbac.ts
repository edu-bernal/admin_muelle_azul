// Catálogo de roles y permisos (fuente de verdad del RBAC).
// El seed replica esto en las tablas Rol/Permiso/RolPermiso para roles editables a futuro,
// pero las verificaciones en tiempo de ejecución usan este mapa (rápido, sin roundtrip a BD).

export const PERMISOS: Record<string, string> = {
  "config.gestionar": "Configuración del sistema",
  "usuarios.leer": "Ver usuarios",
  "usuarios.gestionar": "Crear/editar usuarios y roles",
  "propietarios.leer": "Ver propietarios",
  "propietarios.gestionar": "Crear/editar propietarios",
  "unidades.leer": "Ver unidades/propiedades",
  "unidades.gestionar": "Crear/editar unidades",
  "finanzas.emitir": "Emitir cuotas (masiva e individual)",
  "finanzas.pagos.registrar": "Registrar pagos",
  "finanzas.pagos.validar": "Validar/rechazar pagos declarados",
  "finanzas.pagos.declarar": "Declarar un pago (propietario)",
  "finanzas.estadocuenta.todos": "Ver estados de cuenta de todos",
  "finanzas.estadocuenta.propio": "Ver el estado de cuenta propio",
  "finanzas.reportes": "Ver reportes financieros",
  "proveedores.gestionar": "Gestionar proveedores y facturas",
  "servicios.gestionar": "Gestionar servicios de terceros",
  "planillas.gestionar": "Gestionar planillas de personal",
  "portal.ver": "Acceder al portal del propietario",
};

export type RolCodigo =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CONTADOR"
  | "GARITA"
  | "PROPIETARIO"
  | "INQUILINO";

export const ROLES: Record<RolCodigo, { nombre: string; permisos: string[] }> = {
  SUPER_ADMIN: { nombre: "Super Administrador", permisos: ["*"] },
  ADMIN: {
    nombre: "Administrador",
    permisos: [
      "usuarios.leer",
      "propietarios.*",
      "unidades.*",
      "finanzas.*",
      "proveedores.*",
      "servicios.*",
      "planillas.*",
    ],
  },
  CONTADOR: {
    nombre: "Contador / Tesorero",
    permisos: [
      "propietarios.leer",
      "unidades.leer",
      "finanzas.*",
      "proveedores.*",
      "servicios.*",
      "planillas.*",
    ],
  },
  GARITA: {
    nombre: "Vigilancia / Garita",
    permisos: ["propietarios.leer", "unidades.leer"],
  },
  PROPIETARIO: {
    nombre: "Propietario",
    permisos: [
      "portal.ver",
      "finanzas.estadocuenta.propio",
      "finanzas.pagos.declarar",
    ],
  },
  INQUILINO: {
    nombre: "Inquilino",
    permisos: ["portal.ver"],
  },
};

/** ¿El rol tiene el permiso? Soporta comodines "*" y "modulo.*". */
export function hasPermission(rol: string, permiso: string): boolean {
  const def = ROLES[rol as RolCodigo];
  if (!def) return false;
  return def.permisos.some((granted) => {
    if (granted === "*") return true;
    if (granted === permiso) return true;
    if (granted.endsWith(".*")) {
      const prefix = granted.slice(0, -1); // "finanzas."
      return permiso.startsWith(prefix);
    }
    return false;
  });
}

export const ROLES_ADMIN: RolCodigo[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CONTADOR",
  "GARITA",
];
