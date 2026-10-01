import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dec, ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";
import { unidadIdsDePropietario, siguienteNumeroRecibo } from "./shared";
import { eliminarArchivo } from "@/lib/storage";

type Tx = Prisma.TransactionClient;

interface AplicacionResultado {
  aplicado: Prisma.Decimal;
  saldoFavor: Prisma.Decimal;
  periodos: string[];
}

/**
 * Aplica un pago confirmado a los cargos pendientes del propietario, del más
 * antiguo al más nuevo (FIFO). El excedente se registra como saldo a favor.
 * Debe ejecutarse dentro de una transacción.
 */
async function aplicarPagoFIFO(
  tx: Tx,
  pago: { id: string; propietarioId: string; monto: Prisma.Decimal },
  aplicadoPorId?: string | null,
): Promise<AplicacionResultado> {
  const unidadIds = await unidadIdsDePropietario(pago.propietarioId, tx);
  let restante = new Prisma.Decimal(pago.monto);
  const periodos: string[] = [];

  if (unidadIds.length > 0) {
    const cargos = await tx.cargo.findMany({
      where: {
        unidadId: { in: unidadIds },
        estado: { in: ["PENDIENTE", "PARCIAL"] },
      },
      include: { aplicaciones: true },
      orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
    });

    for (const cargo of cargos) {
      if (restante.lte(ZERO)) break;
      const aplicado = cargo.aplicaciones.reduce(
        (acc, a) => acc.plus(a.montoAplicado),
        ZERO,
      );
      const saldoCargo = new Prisma.Decimal(cargo.monto).minus(aplicado);
      if (saldoCargo.lte(ZERO)) continue;

      const aAplicar = restante.lt(saldoCargo) ? restante : saldoCargo;

      await tx.aplicacionPago.create({
        data: {
          pagoId: pago.id,
          cargoId: cargo.id,
          montoAplicado: aAplicar,
          aplicadoPorId: aplicadoPorId ?? null,
        },
      });

      const nuevoAplicado = aplicado.plus(aAplicar);
      const cubierto = nuevoAplicado.gte(new Prisma.Decimal(cargo.monto));
      await tx.cargo.update({
        where: { id: cargo.id },
        data: { estado: cubierto ? "PAGADO" : "PARCIAL" },
      });

      if (cargo.periodo) periodos.push(cargo.periodo.toISOString().slice(0, 7));
      restante = restante.minus(aAplicar);
    }
  }

  if (restante.gt(ZERO)) {
    const saldo = await tx.saldoFavor.upsert({
      where: { propietarioId: pago.propietarioId },
      create: { propietarioId: pago.propietarioId, montoDisponible: restante },
      update: { montoDisponible: { increment: restante } },
    });
    await tx.saldoFavorMovimiento.create({
      data: { saldoFavorId: saldo.id, pagoId: pago.id, monto: restante, signo: 1 },
    });
  }

  return {
    aplicado: new Prisma.Decimal(pago.monto).minus(restante),
    saldoFavor: restante,
    periodos,
  };
}

async function emitirRecibo(
  tx: Tx,
  pagoId: string,
  periodos: string[],
  emitidoPorId?: string | null,
): Promise<number> {
  const numero = await siguienteNumeroRecibo(tx);
  await tx.reciboCaja.create({
    data: {
      numero,
      serie: "CAJA",
      pagoId,
      detallePeriodos: periodos.length ? periodos.join(", ") : null,
      emitidoPorId: emitidoPorId ?? null,
    },
  });
  return numero;
}

export interface RegistrarPagoInput {
  propietarioId: string;
  fechaPago: Date;
  monto: number;
  medio: string;
  banco?: string | null;
  numeroOperacion?: string | null;
  voucherArchivoId?: string | null;
}

export interface PagoResultado {
  pagoId: string;
  reciboNumero: number | null;
  aplicado: number;
  saldoFavor: number;
}

/** El admin/contador registra un pago ya recibido: se confirma y aplica de inmediato. */
export async function registrarPagoAdmin(
  input: RegistrarPagoInput,
  usuarioId?: string | null,
): Promise<PagoResultado> {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        propietarioId: input.propietarioId,
        fechaPago: input.fechaPago,
        monto: dec(input.monto),
        medio: input.medio,
        banco: input.banco ?? null,
        numeroOperacion: input.numeroOperacion ?? null,
        voucherArchivoId: input.voucherArchivoId ?? null,
        estado: "CONFIRMADO",
        declaradoPor: "ADMIN",
        validadoPorId: usuarioId ?? null,
        validadoAt: new Date(),
      },
    });

    const res = await aplicarPagoFIFO(tx, pago, usuarioId);
    const reciboNumero = await emitirRecibo(tx, pago.id, res.periodos, usuarioId);

    await audit(
      {
        usuarioId,
        accion: "REGISTRAR_PAGO",
        entidad: "Pago",
        entidadId: pago.id,
        datosDespues: {
          monto: input.monto,
          medio: input.medio,
          aplicado: res.aplicado.toNumber(),
          saldoFavor: res.saldoFavor.toNumber(),
          recibo: reciboNumero,
        },
      },
      tx,
    );

    return {
      pagoId: pago.id,
      reciboNumero,
      aplicado: res.aplicado.toNumber(),
      saldoFavor: res.saldoFavor.toNumber(),
    };
  });
}

/**
 * Pago en línea (pasarela SIMULADA / sandbox). Representa un cobro exitoso de
 * la pasarela: crea el pago como CONFIRMADO (medio PASARELA), lo aplica por FIFO
 * y emite el recibo. En producción, esto lo dispararía el webhook de la pasarela
 * (Culqi / MercadoPago / Niubiz) tras verificar la transacción.
 */
export async function pagarEnLinea(
  input: Omit<RegistrarPagoInput, "medio">,
  usuarioId?: string | null,
): Promise<PagoResultado> {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        propietarioId: input.propietarioId,
        fechaPago: input.fechaPago,
        monto: dec(input.monto),
        medio: "PASARELA",
        numeroOperacion: input.numeroOperacion ?? null,
        estado: "CONFIRMADO",
        declaradoPor: "PROPIETARIO",
        validadoAt: new Date(),
      },
    });
    const res = await aplicarPagoFIFO(tx, pago, usuarioId);
    const reciboNumero = await emitirRecibo(tx, pago.id, res.periodos, usuarioId);
    await audit(
      {
        usuarioId,
        accion: "PAGO_EN_LINEA",
        entidad: "Pago",
        entidadId: pago.id,
        datosDespues: { monto: input.monto, medio: "PASARELA", recibo: reciboNumero },
      },
      tx,
    );
    return {
      pagoId: pago.id,
      reciboNumero,
      aplicado: res.aplicado.toNumber(),
      saldoFavor: res.saldoFavor.toNumber(),
    };
  });
}

/** El propietario declara un pago desde su portal: queda POR_VALIDAR. */
export async function declararPago(
  input: RegistrarPagoInput,
  usuarioId?: string | null,
): Promise<string> {
  const pago = await prisma.pago.create({
    data: {
      propietarioId: input.propietarioId,
      fechaPago: input.fechaPago,
      monto: dec(input.monto),
      medio: input.medio,
      banco: input.banco ?? null,
      numeroOperacion: input.numeroOperacion ?? null,
      voucherArchivoId: input.voucherArchivoId ?? null,
      estado: "POR_VALIDAR",
      declaradoPor: "PROPIETARIO",
    },
  });
  await audit({
    usuarioId,
    accion: "DECLARAR_PAGO",
    entidad: "Pago",
    entidadId: pago.id,
    datosDespues: {
      monto: input.monto,
      medio: input.medio,
      comprobante: Boolean(input.voucherArchivoId),
    },
  });
  return pago.id;
}

/** El admin valida un pago declarado: lo confirma y aplica FIFO. */
export async function confirmarPago(
  pagoId: string,
  usuarioId?: string | null,
): Promise<PagoResultado> {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({ where: { id: pagoId } });
    if (!pago) throw new Error("Pago no encontrado");
    if (pago.estado !== "POR_VALIDAR")
      throw new Error("Solo se pueden confirmar pagos POR_VALIDAR");

    await tx.pago.update({
      where: { id: pagoId },
      data: { estado: "CONFIRMADO", validadoPorId: usuarioId, validadoAt: new Date() },
    });

    const res = await aplicarPagoFIFO(tx, pago, usuarioId);
    const reciboNumero = await emitirRecibo(tx, pago.id, res.periodos, usuarioId);

    await audit(
      {
        usuarioId,
        accion: "CONFIRMAR_PAGO",
        entidad: "Pago",
        entidadId: pago.id,
        datosAntes: { estado: "POR_VALIDAR" },
        datosDespues: {
          estado: "CONFIRMADO",
          aplicado: res.aplicado.toNumber(),
          recibo: reciboNumero,
        },
      },
      tx,
    );

    return {
      pagoId: pago.id,
      reciboNumero,
      aplicado: res.aplicado.toNumber(),
      saldoFavor: res.saldoFavor.toNumber(),
    };
  });
}

/** El admin rechaza un pago declarado. */
export async function rechazarPago(
  pagoId: string,
  motivo: string,
  usuarioId?: string | null,
): Promise<void> {
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } });
  if (!pago) throw new Error("Pago no encontrado");
  if (pago.estado !== "POR_VALIDAR")
    throw new Error("Solo se pueden rechazar pagos POR_VALIDAR");

  await prisma.pago.update({
    where: { id: pagoId },
    data: { estado: "RECHAZADO", rechazoMotivo: motivo, validadoPorId: usuarioId, validadoAt: new Date() },
  });
  await audit({
    usuarioId,
    accion: "RECHAZAR_PAGO",
    entidad: "Pago",
    entidadId: pagoId,
    datosDespues: { estado: "RECHAZADO", motivo },
  });
}

/**
 * Anula un pago CONFIRMADO: revierte el efecto de sus aplicaciones sobre los
 * cargos (recalculando su estado según lo que quede aplicado) y descuenta el
 * saldo a favor que ese pago haya generado. Nunca se borra físicamente — el
 * pago queda en estado ANULADO con motivo y auditoría (mismo patrón que la
 * anulación de cargos).
 */
export async function anularPago(
  pagoId: string,
  motivo: string,
  usuarioId?: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({
      where: { id: pagoId },
      include: { aplicaciones: true },
    });
    if (!pago) throw new Error("Pago no encontrado");
    if (pago.estado !== "CONFIRMADO") {
      throw new Error(
        "Solo se pueden anular pagos confirmados (los pagos por validar se rechazan)",
      );
    }

    for (const ap of pago.aplicaciones) {
      const cargo = await tx.cargo.findUnique({
        where: { id: ap.cargoId },
        include: { aplicaciones: true },
      });
      if (!cargo || cargo.estado === "ANULADO") continue;

      const restante = cargo.aplicaciones
        .filter((a) => a.id !== ap.id)
        .reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
      const montoCargo = new Prisma.Decimal(cargo.monto);
      const nuevoEstado = restante.lte(ZERO)
        ? "PENDIENTE"
        : restante.gte(montoCargo)
          ? "PAGADO"
          : "PARCIAL";
      await tx.cargo.update({ where: { id: cargo.id }, data: { estado: nuevoEstado } });
    }
    await tx.aplicacionPago.deleteMany({ where: { pagoId } });

    // Revierte el saldo a favor generado por este pago (si aún no fue consumido).
    const movimientos = await tx.saldoFavorMovimiento.findMany({ where: { pagoId } });
    for (const mov of movimientos) {
      if (mov.signo === 1) {
        const saldo = await tx.saldoFavor.findUnique({
          where: { propietarioId: pago.propietarioId },
        });
        if (saldo) {
          const nuevoMonto = new Prisma.Decimal(saldo.montoDisponible).minus(mov.monto);
          await tx.saldoFavor.update({
            where: { id: saldo.id },
            data: { montoDisponible: nuevoMonto.lte(ZERO) ? ZERO : nuevoMonto },
          });
        }
      }
    }
    await tx.saldoFavorMovimiento.deleteMany({ where: { pagoId } });

    await tx.pago.update({
      where: { id: pagoId },
      data: {
        estado: "ANULADO",
        anuladoPorId: usuarioId ?? null,
        anuladoMotivo: motivo,
        anuladoAt: new Date(),
      },
    });

    await audit(
      {
        usuarioId,
        accion: "ANULAR_PAGO",
        entidad: "Pago",
        entidadId: pagoId,
        datosAntes: { estado: "CONFIRMADO" },
        datosDespues: { estado: "ANULADO", motivo },
      },
      tx,
    );
  });
}

export interface EditarPagoInput {
  medio: string;
  banco?: string | null;
  numeroOperacion?: string | null;
  fechaPago: Date;
  monto?: number;
  /**
   * Cuotas que cubre el pago. Solo cuenta en pagos CONFIRMADOS: si cambian, o
   * cambia el monto, el pago se re-aplica. En los POR_VALIDAR todavía no hay
   * nada aplicado y basta con cambiar el monto.
   */
  cargoIds?: string[];
  /** Id de Archivo del comprobante. Si viene, reemplaza al anterior. */
  voucherArchivoId?: string | null;
  /** Quita el comprobante actual. Se ignora si además llega uno nuevo. */
  quitarVoucher?: boolean;
}

export interface Reaplicacion {
  montoAnterior: number;
  montoNuevo: number;
  aplicado: number;
  saldoFavor: number;
  periodos: string[];
}

/**
 * Deshace el efecto de un pago sobre las cuotas y el saldo a favor: borra sus
 * aplicaciones, recalcula el estado de cada cuota con lo que le quede de otros
 * pagos y descuenta del saldo a favor lo que este pago hubiera dejado ahí.
 */
async function revertirEfectoPago(
  tx: Tx,
  pago: { id: string; propietarioId: string },
): Promise<void> {
  const aplicaciones = await tx.aplicacionPago.findMany({ where: { pagoId: pago.id } });
  await tx.aplicacionPago.deleteMany({ where: { pagoId: pago.id } });

  for (const cargoId of new Set(aplicaciones.map((a) => a.cargoId))) {
    const cargo = await tx.cargo.findUnique({
      where: { id: cargoId },
      include: { aplicaciones: true },
    });
    if (!cargo || cargo.estado === "ANULADO") continue;
    const restante = cargo.aplicaciones.reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
    await tx.cargo.update({
      where: { id: cargoId },
      data: {
        estado: restante.lte(ZERO)
          ? "PENDIENTE"
          : restante.gte(new Prisma.Decimal(cargo.monto))
            ? "PAGADO"
            : "PARCIAL",
      },
    });
  }

  const abonos = await tx.saldoFavorMovimiento.findMany({
    where: { pagoId: pago.id, signo: 1 },
  });
  const aDescontar = abonos.reduce((acc, m) => acc.plus(m.monto), ZERO);
  if (aDescontar.gt(ZERO)) {
    const saldo = await tx.saldoFavor.findUnique({
      where: { propietarioId: pago.propietarioId },
    });
    if (saldo) {
      const nuevo = new Prisma.Decimal(saldo.montoDisponible).minus(aDescontar);
      await tx.saldoFavor.update({
        where: { id: saldo.id },
        data: { montoDisponible: nuevo.lte(ZERO) ? ZERO : nuevo },
      });
    }
  }
  await tx.saldoFavorMovimiento.deleteMany({ where: { pagoId: pago.id } });
}

/**
 * Vuelve a aplicar un pago confirmado con otro monto y/o a otras cuotas.
 *
 * Se deshace por completo lo que el pago había hecho y se aplica de nuevo:
 * así el resultado es el mismo que si el pago se hubiera registrado bien desde
 * el principio, sin arrastrar restos de la versión anterior. Las cuotas se
 * cubren de la más antigua a la más nueva, cada una hasta su saldo, y lo que
 * sobre queda como saldo a favor del propietario.
 */
async function reaplicarPago(
  tx: Tx,
  pago: { id: string; propietarioId: string; monto: Prisma.Decimal },
  montoNuevo: Prisma.Decimal,
  cargoIds: string[],
  usuarioId?: string | null,
): Promise<Reaplicacion> {
  // Se admiten las cuotas de las propiedades actuales del propietario y las
  // que el pago ya cubría, aunque la propiedad haya cambiado de dueño luego.
  const [unidadIds, previas] = await Promise.all([
    unidadIdsDePropietario(pago.propietarioId, tx),
    tx.aplicacionPago.findMany({ where: { pagoId: pago.id }, select: { cargoId: true } }),
  ]);
  const yaCubiertas = new Set(previas.map((p) => p.cargoId));

  await revertirEfectoPago(tx, pago);

  const cargos = await tx.cargo.findMany({
    where: { id: { in: cargoIds }, estado: { not: "ANULADO" } },
    include: { aplicaciones: true },
    orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
  });
  const ajenas = cargos.filter(
    (c) => !unidadIds.includes(c.unidadId) && !yaCubiertas.has(c.id),
  );
  if (ajenas.length > 0) {
    throw new Error("Una de las cuotas elegidas no pertenece a este propietario");
  }

  let restante = montoNuevo;
  const periodos: string[] = [];
  for (const cargo of cargos) {
    if (restante.lte(ZERO)) break;
    const aplicado = cargo.aplicaciones.reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
    const saldo = new Prisma.Decimal(cargo.monto).minus(aplicado);
    if (saldo.lte(ZERO)) continue;
    const aAplicar = restante.lt(saldo) ? restante : saldo;

    await tx.aplicacionPago.create({
      data: {
        pagoId: pago.id,
        cargoId: cargo.id,
        montoAplicado: aAplicar,
        aplicadoPorId: usuarioId ?? null,
      },
    });
    await tx.cargo.update({
      where: { id: cargo.id },
      data: {
        estado: aplicado.plus(aAplicar).gte(new Prisma.Decimal(cargo.monto))
          ? "PAGADO"
          : "PARCIAL",
      },
    });
    if (cargo.periodo) periodos.push(cargo.periodo.toISOString().slice(0, 7));
    restante = restante.minus(aAplicar);
  }

  if (restante.gt(ZERO)) {
    const saldo = await tx.saldoFavor.upsert({
      where: { propietarioId: pago.propietarioId },
      create: { propietarioId: pago.propietarioId, montoDisponible: restante },
      update: { montoDisponible: { increment: restante } },
    });
    await tx.saldoFavorMovimiento.create({
      data: { saldoFavorId: saldo.id, pagoId: pago.id, monto: restante, signo: 1 },
    });
  }

  await tx.pago.update({ where: { id: pago.id }, data: { monto: montoNuevo } });

  // El recibo lee monto y aplicaciones en vivo; solo el detalle de meses está
  // guardado y hay que ponerlo al día.
  await tx.reciboCaja.updateMany({
    where: { pagoId: pago.id },
    data: { detallePeriodos: periodos.length ? periodos.join(", ") : null },
  });

  return {
    montoAnterior: new Prisma.Decimal(pago.monto).toNumber(),
    montoNuevo: montoNuevo.toNumber(),
    aplicado: montoNuevo.minus(restante).toNumber(),
    saldoFavor: restante.toNumber(),
    periodos,
  };
}

/**
 * Edita un pago. Los datos del medio, la fecha y el comprobante se cambian
 * siempre. El monto, en un pago POR_VALIDAR, se cambia sin más porque aún no
 * se ha aplicado; en uno CONFIRMADO, cambiar el monto o las cuotas que cubre
 * re-aplica el pago (ver `reaplicarPago`).
 */
export async function editarPago(
  pagoId: string,
  input: EditarPagoInput,
  usuarioId?: string | null,
): Promise<Reaplicacion | null> {
  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: { aplicaciones: { select: { cargoId: true } } },
  });
  if (!pago) throw new Error("Pago no encontrado");
  if (pago.estado === "ANULADO" || pago.estado === "RECHAZADO") {
    throw new Error("No se puede editar un pago anulado o rechazado");
  }
  if (input.monto != null && !(input.monto > 0)) {
    throw new Error("El monto debe ser mayor que cero");
  }

  const data: Prisma.PagoUncheckedUpdateInput = {
    medio: input.medio,
    banco: input.banco ?? null,
    numeroOperacion: input.numeroOperacion ?? null,
    fechaPago: input.fechaPago,
  };
  if (pago.estado === "POR_VALIDAR" && input.monto != null) {
    data.monto = dec(input.monto);
  }

  const anterior = pago.voucherArchivoId;
  // Subir uno nuevo manda sobre la casilla de quitar: si el usuario hizo
  // ambas cosas, lo que quiere es reemplazarlo.
  const quitar = Boolean(input.quitarVoucher) && !input.voucherArchivoId;
  if (input.voucherArchivoId) {
    data.voucherArchivoId = input.voucherArchivoId;
  } else if (quitar) {
    data.voucherArchivoId = null;
  }

  const cuotasAntes = pago.aplicaciones.map((a) => a.cargoId).sort();
  const montoNuevo = input.monto != null ? dec(input.monto) : new Prisma.Decimal(pago.monto);
  const cuotasNuevas = input.cargoIds ? [...new Set(input.cargoIds)].sort() : cuotasAntes;
  const hayQueReaplicar =
    pago.estado === "CONFIRMADO" &&
    (!montoNuevo.eq(new Prisma.Decimal(pago.monto)) ||
      cuotasNuevas.join() !== cuotasAntes.join());

  let reaplicacion: Reaplicacion | null = null;
  await prisma.$transaction(
    async (tx) => {
      await tx.pago.update({ where: { id: pagoId }, data });
      if (hayQueReaplicar) {
        reaplicacion = await reaplicarPago(tx, pago, montoNuevo, cuotasNuevas, usuarioId);
      }
    },
    { timeout: 30000, maxWait: 10000 },
  );

  // El archivo anterior se borra tanto al reemplazarlo como al quitarlo,
  // para no dejarlo huérfano ocupando el almacenamiento.
  const reemplazado =
    Boolean(input.voucherArchivoId) && anterior !== input.voucherArchivoId;
  if (anterior && (quitar || reemplazado)) {
    await eliminarArchivo(anterior);
  }

  await audit({
    usuarioId,
    accion: reaplicacion ? "REAPLICAR_PAGO" : "EDITAR_PAGO",
    entidad: "Pago",
    entidadId: pagoId,
    datosAntes: reaplicacion
      ? { monto: new Prisma.Decimal(pago.monto).toString(), cuotas: cuotasAntes }
      : undefined,
    datosDespues: {
      medio: input.medio,
      monto: montoNuevo.toString(),
      ...(reaplicacion ? { reaplicacion } : {}),
      comprobante: input.voucherArchivoId
        ? "reemplazado"
        : quitar
          ? "eliminado"
          : "sin cambios",
    },
  });

  return reaplicacion;
}

/**
 * Elimina un pago por completo (borrado físico) — a diferencia de
 * `anularPago`, que conserva el registro marcado como ANULADO para el
 * rastro contable, esta acción es para corregir un error de captura (pago
 * duplicado, propietario equivocado, prueba). Si el pago estaba CONFIRMADO,
 * primero revierte su efecto sobre los cargos afectados (recalcula su
 * estado según lo que quede aplicado) y descuenta el saldo a favor que
 * hubiera generado — igual que `anularPago` — y también borra su recibo de
 * caja si existía. Queda una entrada de auditoría con los datos del pago
 * eliminado, ya que la fila en sí desaparece.
 */
export async function eliminarPago(
  pagoId: string,
  motivo: string,
  usuarioId?: string | null,
): Promise<void> {
  let voucherABorrar: string | null = null;

  await prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({
      where: { id: pagoId },
      include: { aplicaciones: true, recibo: true },
    });
    if (!pago) throw new Error("Pago no encontrado");

    if (pago.estado === "CONFIRMADO") {
      for (const ap of pago.aplicaciones) {
        const cargo = await tx.cargo.findUnique({
          where: { id: ap.cargoId },
          include: { aplicaciones: true },
        });
        if (!cargo || cargo.estado === "ANULADO") continue;

        const restante = cargo.aplicaciones
          .filter((a) => a.id !== ap.id)
          .reduce((acc, a) => acc.plus(a.montoAplicado), ZERO);
        const montoCargo = new Prisma.Decimal(cargo.monto);
        const nuevoEstado = restante.lte(ZERO)
          ? "PENDIENTE"
          : restante.gte(montoCargo)
            ? "PAGADO"
            : "PARCIAL";
        await tx.cargo.update({ where: { id: cargo.id }, data: { estado: nuevoEstado } });
      }

      const movimientos = await tx.saldoFavorMovimiento.findMany({ where: { pagoId } });
      for (const mov of movimientos) {
        if (mov.signo === 1) {
          const saldo = await tx.saldoFavor.findUnique({
            where: { propietarioId: pago.propietarioId },
          });
          if (saldo) {
            const nuevoMonto = new Prisma.Decimal(saldo.montoDisponible).minus(mov.monto);
            await tx.saldoFavor.update({
              where: { id: saldo.id },
              data: { montoDisponible: nuevoMonto.lte(ZERO) ? ZERO : nuevoMonto },
            });
          }
        }
      }
    }

    await audit(
      {
        usuarioId,
        accion: "ELIMINAR_PAGO",
        entidad: "Pago",
        entidadId: pagoId,
        datosAntes: {
          propietarioId: pago.propietarioId,
          monto: pago.monto.toString(),
          medio: pago.medio,
          estado: pago.estado,
          fechaPago: pago.fechaPago.toISOString(),
        },
        datosDespues: { motivo },
      },
      tx,
    );

    await tx.saldoFavorMovimiento.deleteMany({ where: { pagoId } });
    await tx.aplicacionPago.deleteMany({ where: { pagoId } });
    if (pago.recibo) {
      await tx.reciboCaja.delete({ where: { id: pago.recibo.id } });
    }
    voucherABorrar = pago.voucherArchivoId;
    await tx.pago.delete({ where: { id: pagoId } });
  });

  // Fuera de la transacción: borrar el blob es una llamada externa y no debe
  // mantener abierta la transacción de base de datos.
  if (voucherABorrar) await eliminarArchivo(voucherABorrar);
}

/**
 * Emite el recibo de caja de un pago que aún no lo tiene.
 *
 * Los pagos registrados por la app ya generan su recibo automáticamente; esto
 * cubre los que llegaron por otra vía —principalmente la migración histórica—
 * y los casos en que hay que reponer el comprobante.
 *
 * Consume el siguiente número del correlativo, así que sólo debe usarse cuando
 * el pago realmente necesita un comprobante nuevo.
 */
export async function emitirReciboPago(
  pagoId: string,
  usuarioId?: string | null,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({
      where: { id: pagoId },
      include: {
        recibo: true,
        aplicaciones: { include: { cargo: { select: { periodo: true } } } },
      },
    });
    if (!pago) throw new Error("Pago no encontrado");
    if (pago.recibo)
      throw new Error(`El pago ya tiene el recibo N° ${pago.recibo.numero}`);
    if (pago.estado !== "CONFIRMADO")
      throw new Error("Solo se emite recibo de pagos confirmados");

    // Mismos períodos que habría tomado la aplicación FIFO, en orden.
    const periodos = pago.aplicaciones
      .map((a) => a.cargo.periodo)
      .filter((p): p is Date => p !== null)
      .sort((a, b) => a.getTime() - b.getTime())
      .map((p) => p.toISOString().slice(0, 7));

    const numero = await emitirRecibo(tx, pago.id, periodos, usuarioId);

    await audit(
      {
        usuarioId,
        accion: "EMITIR_RECIBO",
        entidad: "Pago",
        entidadId: pago.id,
        datosDespues: { recibo: numero, periodos: periodos.join(", ") },
      },
      tx,
    );

    return numero;
  });
}
