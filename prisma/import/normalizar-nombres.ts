/**
 * Corrige los nombres de propietarios escritos en MAYÚSCULAS, dejándolos con
 * capitalización normal. No toca los que ya vienen en mixto.
 *
 *   npx tsx prisma/import/normalizar-nombres.ts             # simulación
 *   npx tsx prisma/import/normalizar-nombres.ts --apply     # aplica cambios
 */
import { PrismaClient } from "@prisma/client";
import { formatearNombrePropio, esTodoMayusculas } from "../../src/lib/nombres";

const prisma = new PrismaClient();
const APLICAR = process.argv.includes("--apply");

async function main() {
  const propietarios = await prisma.propietario.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const cambios = propietarios
    .map((p) => ({ ...p, nuevo: formatearNombrePropio(p.nombre) }))
    .filter((p) => p.nuevo !== p.nombre);

  console.log(`Propietarios totales:      ${propietarios.length}`);
  console.log(`En MAYÚSCULAS:             ${propietarios.filter((p) => esTodoMayusculas(p.nombre)).length}`);
  console.log(`Se corregirán:             ${cambios.length}`);
  console.log(`Se dejan intactos:         ${propietarios.length - cambios.length}\n`);

  const muestra = APLICAR ? cambios.slice(0, 10) : cambios;
  for (const c of muestra) {
    console.log(`  ${c.nombre}\n→ ${c.nuevo}\n`);
  }

  if (!APLICAR) {
    console.log("SIMULACIÓN — no se escribió nada. Usa --apply para aplicar.");
    return;
  }

  let n = 0;
  for (const c of cambios) {
    await prisma.propietario.update({
      where: { id: c.id },
      data: { nombre: c.nuevo },
    });
    n++;
  }
  console.log(`\n${n} nombres actualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
