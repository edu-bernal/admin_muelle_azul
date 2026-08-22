/**
 * Normaliza nombres de propietarios escritos en MAYÚSCULAS a capitalización
 * normal ("JUAN DE LA CRUZ" → "Juan de la Cruz").
 *
 * Los datos reales del padrón traen tres complicaciones:
 *  - partículas de apellidos compuestos que van en minúscula ("de", "del", "y")
 *  - razones sociales con siglas que deben quedar en mayúscula (SAC, EIRL, S.A.)
 *  - anotaciones entre paréntesis o tras guiones que también hay que capitalizar
 */

/** Partículas que van en minúscula salvo que abran el nombre. */
const PARTICULAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "e",
  "en",
  "por",
  "da",
  "das",
  "dos",
  "van",
  "von",
  "di",
  "du",
]);

/** Siglas y formas societarias que se conservan en mayúscula. */
const SIGLAS = new Set([
  "SAC",
  "SA",
  "SAA",
  "SRL",
  "EIRL",
  "SCRL",
  "SAB",
  "DNI",
  "RUC",
  "AC",
  "AMP",
  "II",
  "III",
  "IV",
]);

/** true si el texto está íntegramente en mayúsculas (ignorando signos). */
export function esTodoMayusculas(texto: string): boolean {
  return texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(texto);
}

function capitalizarPalabra(palabra: string, esPrimera: boolean): string {
  // Se compara sin puntos ni signos: "S.A." y "VDA." deben reconocerse igual.
  const soloLetras = palabra.replace(/[^\p{L}]/gu, "");
  if (!soloLetras) return palabra;

  if (SIGLAS.has(soloLetras.toUpperCase())) return palabra.toUpperCase();

  const minuscula = palabra.toLowerCase();
  // Las partículas se evalúan antes que las siglas: la "Y" que une a dos
  // titulares no tiene vocales, pero es conjunción, no una razón social.
  if (!esPrimera && PARTICULAS.has(soloLetras.toLowerCase())) return minuscula;

  // Sigla no listada: en español toda palabra tiene vocal, así que una corta
  // sin vocales (GMV, SKF) son iniciales de una razón social.
  if (soloLetras.length <= 4 && !/[AEIOUÁÉÍÓÚÜ]/i.test(soloLetras)) {
    return palabra.toUpperCase();
  }

  // Capitaliza la primera letra real, respetando prefijos como "(" o comillas.
  return minuscula.replace(/\p{L}/u, (c) => c.toUpperCase());
}

/**
 * Devuelve el nombre con capitalización normal. Si ya viene en minúsculas o
 * mixto se deja intacto: sólo corrige lo que está escrito todo en mayúsculas.
 */
export function formatearNombrePropio(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (!esTodoMayusculas(limpio)) return limpio;

  let primeraPendiente = true;
  return limpio
    .split(" ")
    .map((palabra) => {
      const resultado = capitalizarPalabra(palabra, primeraPendiente);
      // Tras un separador ("-", "//") la siguiente palabra vuelve a ser inicial,
      // porque suele empezar el nombre de un segundo titular.
      if (/^[-–—/|,]+$/.test(palabra)) {
        primeraPendiente = true;
      } else if (/\p{L}/u.test(palabra)) {
        primeraPendiente = false;
      }
      return resultado;
    })
    .join(" ");
}
