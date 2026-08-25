/**
 * Constantes de los comprobantes de pago. Viven aparte de `storage.ts` porque
 * las usa el formulario (componente cliente) y storage.ts importa módulos de
 * Node (fs, path) que no existen en el navegador.
 */

/** Tipos aceptados como comprobante de pago. */
export const MIME_COMPROBANTE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

/** Tope por archivo. Una foto de celular ronda 1–3 MB. */
export const MAX_BYTES = 8 * 1024 * 1024;

export const ACCEPT_COMPROBANTE = "image/*,application/pdf";
