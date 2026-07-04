# Diseño Funcional — Condominio Muelle Azul

**Versión:** 1.0 · **Fecha:** 04/07/2026

Este documento detalla los módulos, casos de uso, reglas de negocio y pantallas del sistema. La prioridad de cada funcionalidad se indica como **[F1]** (MVP), **[F2]** o **[F3]** según el [Plan Maestro](00-PLAN-MAESTRO.md).

---

## 1. Matriz de acceso por rol

| Módulo | Super Admin | Admin | Contador | Garita | Propietario | Inquilino |
|---|---|---|---|---|---|---|
| Configuración del sistema | CRUD | — | — | — | — | — |
| Usuarios y roles | CRUD | Lectura | — | — | — | — |
| Propietarios | CRUD | CRUD | Lectura | Lectura básica | Su perfil | Su perfil |
| Propiedades | CRUD | CRUD | Lectura | Lectura básica | Sus unidades | Su unidad |
| Cuotas (emisión) | CRUD | CRUD | CRUD | — | Las suyas (lectura) | — |
| Pagos (registro/validación) | CRUD | CRUD | CRUD | — | Los suyos + declarar pago | — |
| Estados de cuenta | Todos | Todos | Todos | — | El suyo | — |
| Proveedores | CRUD | CRUD | CRUD | — | — | — |
| Servicios de terceros | CRUD | CRUD | CRUD | — | — | — |
| Planillas | CRUD | CRUD | CRUD | — | — | — |
| Reservas áreas comunes | CRUD | CRUD | Lectura | Lectura | Crear/ver las suyas | Crear/ver las suyas |
| Accesos y visitas | CRUD | CRUD | — | Registrar E/S | Pre-autorizar visitas | Pre-autorizar visitas |
| Incidencias | CRUD | CRUD | Lectura | Crear | Crear/ver las suyas | Crear/ver las suyas |
| Comunicados | CRUD | CRUD | — | Lectura | Lectura | Lectura |
| Multas | CRUD | CRUD | Lectura | — | Las suyas (lectura) | — |
| Documentos | CRUD | CRUD | Lectura | — | Lectura (públicos) | Lectura (públicos) |
| Presupuesto | CRUD | CRUD | CRUD | — | Lectura (resumen) | — |
| Votaciones | CRUD | CRUD | — | — | Votar | — |
| Dashboard KPI | Sí | Sí | Sí | — | Resumen propio | — |

---

## 2. Módulo: Gestión de Propietarios [F1]

### Funcionalidades
- **FP-01** Registrar propietario: nombres, tipo y n.º de documento (DNI/CE/RUC/Pasaporte — opcional al inicio: el padrón actual no lo registra, se exige al activar la cuenta), hasta 2 correos y 2 teléfonos (como el maestro actual), **canal de envío preferido (Correo / WhatsApp)**, dirección de residencia habitual (los propietarios de playa no viven en el condominio), contacto de emergencia.
- **FP-02** Asociar propietario ↔ propiedad(es) con porcentaje de copropiedad y rango de fechas (histórico de transferencias/ventas).
- **FP-03** Registrar inquilinos/ocupantes por unidad con vigencia (clave en verano: alquileres temporales).
- **FP-04** Invitar al portal: genera usuario y correo de activación.
- **FP-05** Historial del propietario: unidades, pagos, deuda, reservas, incidencias, multas.
- **FP-06** [F2] Registro de residentes adicionales, personal doméstico, mascotas y vehículos por unidad.

### Reglas de negocio
- **RN-P1** Una propiedad puede tener varios copropietarios; se designa **un responsable de pago** (recibe las cuotas y el estado de cuenta).
- **RN-P2** Un propietario puede tener varias propiedades; su estado de cuenta consolida todas, con detalle por unidad.
- **RN-P3** Al transferir una propiedad (venta), la deuda queda asociada a la unidad; el sistema alerta si hay deuda pendiente al registrar el cambio de propietario y permite decidir si migra al nuevo propietario o se liquida (constancia de no adeudo).
- **RN-P4** No se puede eliminar un propietario con movimientos; solo se **inactiva**.

---

## 3. Módulo: Gestión de Propiedades [F1]

### Funcionalidades
- **FU-01** Registrar unidades: código (ej. "Casa A-12"), tipo (casa, departamento, estacionamiento, depósito), etapa/manzana/torre, área construida y ocupada, alícuota (%), estado (ocupada, alquilada, en venta, desocupada).
- **FU-02** Agrupar unidades vinculadas (casa + estacionamiento + depósito) para cobro consolidado.
- **FU-03** Ficha de la unidad: propietarios (histórico), ocupantes actuales, deuda, medidores asociados, vehículos.
- **FU-04** Configurar por unidad la base de cálculo de la cuota: por alícuota, monto fijo o por m² (parametrizable a nivel condominio con excepciones por unidad).

### Reglas de negocio
- **RN-U1** El código de unidad es único e inmutable (es la llave de toda la historia financiera).
- **RN-U2** La suma de alícuotas debería ser 100%; el sistema muestra advertencia (no bloqueo) si no cuadra.
- **RN-U3** Toda unidad debe tener al menos un propietario vigente para poder emitir cuotas.

---

## 4. Módulo: Cuotas, Pagos y Cobranza [F1]

Es el corazón del sistema. Se basa en un modelo de **cargos** (lo que la unidad debe) y **pagos** (lo que se recibe), con **aplicación** de pagos a cargos.

### 4.1 Conceptos de cobro (configurables)
- Cuota de mantenimiento ordinaria (mensual). *Real: S/ 100 (2021–2024), S/ 150 (2025+), con historial de tarifas por año.*
- Cuota extraordinaria (obras, fondo de contingencia). *Reales: Constitución 2021, Cuota Extraordinaria Oleaje 2025, Cuota Extraordinaria por Desastre, aporte de Navidad.*
- Vigilancia de propiedad (servicio opcional por lote, ver §6-bis).
- Multas por infracciones [F2].
- Consumos individuales (agua por medidor) [F3].
- Intereses/mora y gastos administrativos de cobranza.
- Otros cargos manuales (ej. reposición de tarjeta/llave, alquiler de área común).

### 4.2 Funcionalidades
- **FC-01** **Emisión masiva de cuotas**: el admin genera las cuotas del período para todas las unidades activas en un solo paso, con previsualización antes de confirmar. Configurable: concepto, monto (según base de cálculo de cada unidad), fecha de emisión y fecha de vencimiento.
- **FC-02** Emisión individual de cargos (multa, extraordinaria a una unidad, ajuste).
- **FC-03** **Registro de pago** por el admin/contador: fecha, monto, medio (transferencia, Yape, Plin, efectivo, cheque, depósito), n.º de operación, banco, comprobante adjunto (imagen/PDF).
- **FC-04** **Declaración de pago por el propietario**: desde su portal sube el voucher; queda en estado *Por validar* hasta que el admin lo confirme o rechace (con motivo). Notificación en ambos sentidos.
- **FC-05** **Aplicación de pagos**: automática al cargo más antiguo (FIFO) por defecto; el admin puede reasignar manualmente. Soporta pagos parciales y pagos a cuenta (saldo a favor).
- **FC-06** **Recargos por mora**: parametrizable — % o monto fijo, días de gracia, aplicación automática o con aprobación. Generación mensual de intereses sobre cargos vencidos.
- **FC-07** **Seguimiento de morosidad**: reporte por antigüedad (corriente, 1–30, 31–60, 61–90, 90+ días), ranking de deudores, exportable.
- **FC-08** **Recordatorios automáticos**: correo N días antes del vencimiento, al vencer y recordatorios de deuda vencida (plantillas y frecuencia configurables).
- **FC-09** Anulación/reversión de cargos y pagos con motivo y auditoría (nunca borrado físico).
- **FC-10** Constancia de no adeudo en PDF.
- **FC-11** [F3] Pago en línea vía pasarela (Culqi / MercadoPago / Niubiz) y conciliación asistida por carga de extracto bancario (Excel/CSV del banco → sugerencia de matching por monto y n.º de operación).
- **FC-12** **Recibo de caja en PDF con numeración correlativa global** (continúa la serie actual de la administración, último ≈ 798), con detalle de períodos pagados, serie CAJA (cuotas) y VARIOS (otros conceptos), y **reimpresión controlada** (marca "Reimpreso" + registro de quién/cuándo). El propietario descarga sus recibos desde su portal.
- **FC-13** **Ingresos varios**: registro de ingresos no asociados a cargos (actividades: almuerzos, venta de platos; ventas varias; donaciones), con recibo serie VARIOS. Alimentan el flujo de caja.
- **FC-14** [F2] **Campañas de regularización** (tipo "Ponte al Día" 2023): definición de campaña con vigencia, acogimiento por unidad con monto convenido (menor a la deuda), seguimiento de cumplimiento y condonación auditada del saldo restante al cumplirse. Reporte de acogidos/cumplidos.

### Reglas de negocio
- **RN-C1** Un cargo emitido no se edita: se anula (nota de crédito interna) y se re-emite. Garantiza trazabilidad.
- **RN-C2** Estados del cargo: `Pendiente → Parcial → Pagado` / `Anulado`. Estados del pago: `Por validar → Confirmado` / `Rechazado` / `Anulado`.
- **RN-C3** Un pago confirmado impacta el estado de cuenta de inmediato.
- **RN-C4** La deuda es **de la unidad**, el cobro se dirige al responsable de pago vigente.
- **RN-C5** Saldos a favor se aplican automáticamente a la siguiente emisión, salvo configuración contraria.
- **RN-C6** Todo movimiento financiero registra: usuario, fecha/hora, IP (auditoría).

---

## 5. Módulo: Estados de Cuenta y Reportes [F1]

### Funcionalidades
- **FE-01** **Estado de cuenta por propietario** (consolidado y por unidad): saldo anterior, cargos del período, pagos, mora, saldo final; con detalle de movimientos. Exportable a **PDF** (formato de envío) y **Excel**.
- **FE-02** Envío automático mensual del estado de cuenta por correo (PDF adjunto) tras la emisión de cuotas.
- **FE-03** Reportes de administración:
  - Recaudación por período (emitido vs. cobrado, % de cobranza).
  - **Recaudación y % de participación por sector** (MA Central, MA Ampliación, MA Oeste, MA Norte) — reporte que la administración ya elabora manualmente en cada hoja mensual.
  - Morosidad por antigüedad y por unidad/propietario.
  - Egresos por categoría (servicios, planillas, proveedores, mantenimiento).
  - Flujo de caja mensual (saldo anterior + cuotas + extraordinarias + ingresos varios − salidas = resultado del mes) — replica el "Balance" que hoy llevan en Excel.
  - [F2] Ejecución presupuestal (presupuesto vs. real por partida).
- **FE-04** [F2] **Rendición mensual a propietarios**: reporte-resumen de ingresos y gastos del mes visible en el portal del propietario (transparencia).

---

## 6. Módulo: Servicios de Terceros [F1]

Contratos recurrentes del condominio: vigilancia, jardinería, limpieza, mantenimiento de piscina, recojo de basura, fumigación, internet/cámaras, luz y agua de áreas comunes.

### Funcionalidades
- **FS-01** Registrar servicio: proveedor, tipo, descripción, monto y periodicidad (mensual/trimestral/anual/variable), día de pago, fecha de inicio/fin de contrato, archivo del contrato.
- **FS-02** **Calendario de pagos recurrentes**: el sistema genera las obligaciones del mes y alerta vencimientos próximos.
- **FS-03** Registrar pago del servicio con comprobante (factura/recibo) → alimenta egresos y flujo de caja.
- **FS-04** Alertas de vencimiento de contrato (renovación) y variación de monto vs. mes anterior.
- **FS-05** Historial de pagos por servicio y por proveedor.
- **FS-06** **Servicios de temporada** (propio de condominio de playa): servicios con vigencia estacional y pago por jornada — caso real: **salvavidas** los fines de semana de verano (S/ 150–180 por atención). El sistema permite registrar contratos por temporada y pagos por día trabajado.

---

## 6-bis. Módulo: Servicios Opcionales por Unidad — Vigilancia de Propiedad [F2]

La administración ofrece hoy un servicio de **"propiedad vigilada"** al que se suscriben casas y terrenos individuales (registrado en la hoja "Seguridad" de los Excel). Es típico de un condominio de playa: las casas quedan deshabitadas fuera de temporada.

- **FO-01** Suscripción de una unidad al servicio (tipo VIGILANCIA, extensible a otros), con tarifa mensual y vigencia.
- **FO-02** La emisión mensual genera automáticamente el cargo `VIGILANCIA` a las unidades suscritas (mismo motor de cuotas: aparece en el estado de cuenta, admite mora y recordatorios).
- **FO-03** Reporte mensual de propiedades vigiladas con estado de pago (reemplaza la hoja "Seguridad") — visible también para el personal de vigilancia.
- **FO-04** El propietario ve su suscripción en el portal y puede solicitar alta/baja (aprobación del admin).

---

## 7. Módulo: Planillas de Personal [F1 básico / F3 avanzado]

Personal administrativo (administrador, contador) y de mantenimiento (jardineros, piscinero, limpieza, vigilantes propios si no son tercerizados).

### Funcionalidades — F1 (registro)
- **FN-01** Ficha del trabajador: datos personales, puesto, tipo de contrato, fecha de ingreso/cese, sueldo base, cuenta bancaria, documentos (contrato, DNI).
- **FN-02** **Planilla mensual**: generar la planilla del mes con el personal activo; registrar por trabajador: sueldo, bonificaciones, horas extra, descuentos, **adelantos** (con control de saldo), neto a pagar.
- **FN-03** Registrar el pago de la planilla (individual o masivo) con constancia; genera el egreso correspondiente.
- **FN-04** Gratificaciones y CTS como conceptos registrables (montos ingresados manualmente en v1).
- **FN-05** Historial de pagos por trabajador y costo laboral total por período.

### Funcionalidades — F3 (avanzado, opcional)
- **FN-06** Cálculo asistido de aportes (AFP/ONP, EsSalud) con tasas parametrizables.
- **FN-07** Control de asistencia/turnos del personal de mantenimiento.
- **FN-08** Boleta de pago en PDF por trabajador.

### Reglas de negocio
- **RN-N1** Un adelanto registrado se descuenta automáticamente como sugerencia en la siguiente planilla (editable).
- **RN-N2** La planilla cerrada no se edita; ajustes van en la siguiente o como planilla complementaria.

---

## 8. Módulo: Proveedores [F1]

### Funcionalidades
- **FV-01** Maestro de proveedores: razón social, RUC, contacto, rubro (jardinería, piscina, construcción, eléctrico...), cuentas bancarias, estado.
- **FV-02** Registro de facturas/recibos por honorarios del proveedor: n.º de comprobante, fecha, monto, detalle, archivo adjunto; estados `Pendiente → Pagado` / `Anulado`.
- **FV-03** Pagos a proveedores (parciales o totales) con constancia → alimenta egresos.
- **FV-04** Historial y ranking de gasto por proveedor y por categoría.
- **FV-05** [F2] Evaluación simple del proveedor (puntualidad, calidad, 1–5 estrellas + comentario) para decisiones de renovación.
- **FV-06** [F2] Cuentas por pagar: reporte de facturas pendientes por vencimiento.

---

## 9. Módulo: Reservas de Áreas Comunes [F2]

Áreas típicas de Muelle Azul: piscina (aforo), zona de parrillas, salón multiusos, cancha deportiva, zona de campamento/fogata.

### Funcionalidades
- **FR-01** Configurar áreas: nombre, aforo, horarios disponibles, duración máxima, tarifa (si aplica), anticipación mínima/máxima, reglas (ej. máx. 2 reservas activas por unidad), temporada (reglas distintas en verano).
- **FR-02** Propietario reserva desde su portal (calendario con disponibilidad); confirmación automática o con aprobación del admin (configurable por área).
- **FR-03** Cobro de tarifa y/o garantía: se genera cargo en el estado de cuenta.
- **FR-04** Bloqueos por mantenimiento y bloqueo por morosidad (configurable: deudor con > N cuotas vencidas no puede reservar).
- **FR-05** Vista para garita/admin: reservas del día.

---

## 10. Módulo: Control de Acceso y Visitas [F2]

### Funcionalidades
- **FA-01** Propietario pre-autoriza visitas desde su portal: nombre, DNI, fecha/rango, vehículo (placa). Genera código/QR opcional.
- **FA-02** Garita registra ingreso/salida: visitas, delivery, taxis, personal doméstico, proveedores y trabajadores de obras.
- **FA-03** Autorizaciones permanentes (familiares, personal doméstico recurrente) con vigencia.
- **FA-04** **Registro de inquilinos temporales** (alquiler de verano): el propietario declara al inquilino y su periodo; garita valida el ingreso contra esa declaración.
- **FA-05** Padrón vehicular de residentes (placa → unidad) para control rápido en garita.
- **FA-06** Reportes: visitas por unidad/período, personal en obra por unidad.

### Reglas de negocio
- **RN-A1** El módulo de garita es de captura rápida (≤ 3 campos obligatorios) y usable en tablet.
- **RN-A2** [Configurable] Restricción de mudanzas/obras para unidades morosas, según reglamento interno.

---

## 11. Módulo: Incidencias y Mantenimiento [F2]

- **FI-01** Cualquier usuario autorizado crea un ticket: categoría (eléctrico, sanitario, piscina, jardines, seguridad, limpieza), descripción, fotos, ubicación.
- **FI-02** Flujo: `Reportada → En evaluación → Asignada (personal interno o proveedor) → En ejecución → Resuelta → Cerrada` (cierre con conformidad del reportante o automático a los N días).
- **FI-03** Costo asociado: la incidencia puede generar orden a proveedor o registro de gasto → trazabilidad gasto ↔ incidencia.
- **FI-04** Mantenimiento preventivo programado [F3]: tareas recurrentes (limpieza de piscina lunes/jueves, poda mensual, fumigación trimestral) con checklist y responsable.
- **FI-05** Indicadores: tiempo medio de resolución, incidencias por categoría, costo de mantenimiento por mes.

---

## 12. Módulo: Comunicados y Notificaciones [F2]

- **FM-01** Comunicados con título, cuerpo (texto enriquecido), adjuntos, audiencia (todos, por etapa/manzana, unidades específicas) y vigencia; opción "requiere confirmación de lectura".
- **FM-02** Notificación por correo (v1) y panel de novedades en el portal. WhatsApp/SMS evaluable en F3 vía API.
- **FM-03** Notificaciones transaccionales automáticas: cuota emitida, pago confirmado/rechazado, reserva aprobada, visita registrada, incidencia actualizada, votación abierta.
- **FM-04** Preferencias de notificación por usuario.

---

## 13. Módulo: Multas e Infracciones [F2]

- **FT-01** Catálogo de infracciones según reglamento interno (ruido, mascotas sin correa, mal uso de piscina, obras sin autorización...) con monto o rango.
- **FT-02** Registro de la infracción: unidad, evidencia (fotos), descripción, fecha; flujo de notificación al propietario con plazo de descargo antes de convertirse en cargo.
- **FT-03** Al confirmarse, genera cargo en el estado de cuenta (integración con módulo de cuotas).

---

## 14. Módulo: Presupuesto Anual [F2]

- **FB-01** Definir presupuesto anual por partidas (vigilancia, jardinería, piscina, luz común, agua común, planilla, mantenimiento, fondo de reserva...).
- **FB-02** Ejecución automática: cada egreso registrado (servicio, proveedor, planilla) se etiqueta con una partida → reporte presupuesto vs. real con semáforo de desviación.
- **FB-03** Simulador de cuota: dado el presupuesto y las alícuotas, calcula la cuota necesaria por unidad (soporte para la asamblea).

---

## 15. Módulo: Documentos [F2] y Votaciones [F3]

- **FD-01** Repositorio con carpetas: reglamento interno, actas de asamblea, estados financieros, pólizas, manuales. Visibilidad por rol (público a propietarios / solo administración).
- **FD-02** Versionado simple (reemplazo conserva histórico).
- **FV2-01** [F3] Votaciones: pregunta, opciones, padrón habilitado (propietarios al día u todos, configurable), voto ponderado por alícuota o 1-unidad-1-voto, periodo de votación, resultados y acta exportable.

---

## 16. Dashboard [F2]

**Vista Administrador:**
- Recaudación del mes: emitido vs. cobrado (%).
- Morosidad total y top deudores.
- Egresos del mes por categoría.
- Saldo de caja/bancos (registrado).
- Incidencias abiertas y reservas de la semana.
- Pagos por validar (bandeja de tareas).

**Vista Propietario (home de su portal):**
- Saldo actual (al día / deuda) con botón "Declarar pago".
- Próximo vencimiento.
- Últimos comunicados.
- Sus reservas próximas y estado de sus incidencias.

---

## 17. Requerimientos no funcionales

| Categoría | Requerimiento |
|---|---|
| Usabilidad | Responsive (móvil primero para propietarios y garita); interfaz en español; flujos de ≤ 3 pasos para acciones frecuentes |
| Rendimiento | Páginas < 2 s en 4G; emisión masiva de cuotas para 500 unidades < 30 s |
| Disponibilidad | 99.5% mensual; ventana de mantenimiento notificada |
| Seguridad | Autenticación con contraseña + verificación de correo; RBAC estricto; cifrado en tránsito (TLS) y en reposo (BD y archivos); auditoría de acciones financieras |
| Privacidad | Cumplimiento Ley N.º 29733 (Protección de Datos Personales, Perú); un propietario jamás ve datos financieros de otro |
| Respaldo | Backup diario automatizado de BD y archivos; retención 30 días; prueba de restauración trimestral |
| Auditoría | Log inmutable de operaciones financieras (quién, qué, cuándo, valor anterior/nuevo) |
| Escalabilidad | Diseñado para 1 condominio, hasta ~1,000 unidades y ~3,000 usuarios sin cambios de arquitectura |
