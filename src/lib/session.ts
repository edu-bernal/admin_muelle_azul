import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "muelle_session";
const DAYS_PROPIETARIO = 30;
const HOURS_ADMIN = 8;

export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: string; // código del rol (ADMIN, PROPIETARIO, ...)
  propietarioId: string | null;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CONTADOR", "GARITA"];

export async function createSession(payload: SessionPayload): Promise<void> {
  const isAdmin = ADMIN_ROLES.includes(payload.rol);
  const maxAgeSeconds = isAdmin
    ? HOURS_ADMIN * 60 * 60
    : DAYS_PROPIETARIO * 24 * 60 * 60;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
