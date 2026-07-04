import { prisma } from "@/lib/prisma";
import { Prisma, type MedioPago } from "@prisma/client";
import { dec, ZERO } from "@/lib/money";
import { audit } from "@/lib/audit";
import { unidadIdsDePropietario, siguienteNumeroRecibo } from "./shared";

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
  medio: MedioPago;
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
    datosDespues: { monto: input.monto, medio: input.medio },
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
