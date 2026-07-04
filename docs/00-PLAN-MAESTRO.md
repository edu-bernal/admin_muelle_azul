# Plan Maestro — Sistema de Administración Condominio Muelle Azul

**Versión:** 1.0 · **Fecha:** 04/07/2026 · **Estado:** Aprobación pendiente

---

## 1. Visión

Construir una plataforma web (responsive / PWA) que centralice toda la gestión administrativa y financiera del condominio de playa Muelle Azul, eliminando el uso de Excel, WhatsApp y registros manuales dispersos. La plataforma debe dar **transparencia total a los propietarios** (estados de cuenta, gastos, comunicados) y **eficiencia operativa a la administración** (cobranza, planillas, proveedores, mantenimiento).

## 2. Objetivos medibles

| # | Objetivo | Indicador | Meta |
|---|---|---|---|
| 1 | Digitalizar la cobranza de cuotas | % de cuotas registradas en el sistema | 100% desde el mes 1 en producción |
| 2 | Reducir morosidad | % de cuotas vencidas > 30 días | Reducción del 30% en 6 meses |
| 3 | Transparencia hacia propietarios | Propietarios con acceso activo al portal | ≥ 80% en 3 meses |
| 4 | Ordenar egresos | Gastos (proveedores + planillas) registrados con comprobante | 100% |
| 5 | Reducir carga administrativa | Horas/mes en tareas manuales de cobranza y reportes | Reducción del 50% |

## 3. Alcance

### 3.1 Módulos incluidos (solicitados)

1. **Gestión de propietarios** — padrón, datos de contacto, copropietarios, inquilinos.
2. **Gestión de propiedades** — unidades (casas/departamentos), estacionamientos, depósitos, alícuotas.
3. **Cuotas y pagos** — emisión de cuotas de mantenimiento, cuotas extraordinarias, multas; registro y conciliación de pagos; seguimiento de morosidad.
4. **Estados de cuenta** — por propietario y por propiedad, exportables a PDF/Excel.
5. **Portal diferenciado** — vista Administrador (gestión total) y vista Propietario (solo su información), con roles y permisos.
6. **Servicios de terceros** — contratos y pagos recurrentes (vigilancia, jardinería, limpieza, recojo de basura, internet, etc.).
7. **Planillas de personal** — personal administrativo y de mantenimiento: sueldos, adelantos, gratificaciones, registro de pagos.
8. **Proveedores** — maestro de proveedores, órdenes/facturas, historial de pagos y evaluación.

### 3.2 Módulos recomendados (valor agregado para un condominio de playa)

| Módulo | Justificación para Muelle Azul |
|---|---|
| **Reservas de áreas comunes** | Piscina, zona de parrillas, salón multiusos, canchas. Crítico en temporada de verano donde la demanda se concentra (Ene–Mar). |
| **Control de acceso y visitas** | Registro de visitantes, pre-autorización por el propietario, control de inquilinos temporales (alquileres de verano / Airbnb), personal doméstico y trabajadores. |
| **Comunicados y avisos** | Publicación de comunicados con notificación por correo; avisos urgentes (corte de agua, mantenimiento de piscina, seguridad). |
| **Incidencias y mantenimiento** | Tickets de reporte (luminaria quemada, fuga de agua, daño en áreas comunes) con asignación al personal o proveedor y seguimiento hasta cierre. |
| **Presupuesto anual y control de gastos** | Presupuesto aprobado en asamblea vs. ejecución real, base para el cálculo de la cuota de mantenimiento. |
| **Encuestas y votaciones** | Consultas a propietarios y votaciones simples para decisiones de asamblea (ponderadas por alícuota si aplica). |
| **Documentos del condominio** | Repositorio: reglamento interno, actas de asamblea, memoria anual, pólizas de seguro. |
| **Multas e infracciones** | Registro de infracciones al reglamento (ruido, mascotas, mal uso de áreas comunes) con cargo automático al estado de cuenta. |
| **Gestión de mascotas y vehículos** | Padrón de vehículos (control en garita) y mascotas por unidad. |
| **Lecturas de servicios individuales** | Si el agua/luz de áreas privadas se factura por lectura interna (común en condominios de playa con medidores propios), registro de lecturas y cargo en cuota. |
| **Dashboard e indicadores** | KPI de recaudación, morosidad, ejecución de presupuesto, incidencias abiertas. |

### 3.3 Fuera de alcance (versión 1)

- Facturación electrónica SUNAT (se evalúa en fase posterior si el condominio emite comprobantes).
- Cálculo de planilla con AFP/ONP/EsSalud automático (v1 registra montos; el cálculo tributario se hace externamente o en fase 3).
- App móvil nativa (se cubre con PWA responsive).
- Integración bancaria automática (v1: conciliación manual asistida con carga de extracto).
- Domótica / cámaras / hardware de control de acceso (solo registro por software en garita).

## 4. Usuarios y roles

| Rol | Descripción | Acceso |
|---|---|---|
| **Super Admin** | Administrador del sistema (junta directiva / empresa administradora) | Total, incluye configuración y usuarios |
| **Administrador** | Administrador del condominio | Gestión operativa completa, sin configuración del sistema |
| **Contador / Tesorero** | Gestión financiera | Cuotas, pagos, planillas, proveedores, reportes (sin gestión de usuarios) |
| **Vigilancia / Garita** | Personal de portería | Solo módulo de accesos y visitas (registro de entradas/salidas) |
| **Propietario** | Dueño de una o más unidades | Solo su información: estado de cuenta, pagos, reservas, comunicados, incidencias, votaciones |
| **Inquilino** (opcional) | Arrendatario autorizado por el propietario | Subconjunto del propietario: reservas, comunicados, incidencias (sin estados de cuenta) |

## 5. Fases del proyecto

```
FASE 0          FASE 1 (MVP)         FASE 2                FASE 3
Preparación     Núcleo financiero    Operación diaria      Optimización
2 semanas       6-8 semanas          6 semanas             4-6 semanas
├ Setup repo    ├ Auth y roles       ├ Reservas áreas      ├ Pasarela de pagos
├ Infra base    ├ Propietarios       │  comunes            │  (Culqi/MercadoPago
├ CI/CD         ├ Propiedades        ├ Accesos y visitas   │  /Yape API)
└ Carga de      ├ Cuotas y pagos     ├ Incidencias         ├ Conciliación
  datos         ├ Estados de cuenta  ├ Comunicados         │  bancaria asistida
  históricos    ├ Proveedores        ├ Multas              ├ Votaciones
  (diseño)      ├ Servicios terceros ├ Documentos          ├ Lecturas de
                ├ Planillas (básico) ├ Presupuesto anual   │  medidores
                └ Portal propietario └ Dashboard KPI       └ Planilla avanzada
```

| Fase | Entregable | Duración estimada |
|---|---|---|
| **Fase 0 — Preparación** | Repositorio, infraestructura, CI/CD, modelo de datos implementado, plantillas de migración de datos | 2 semanas |
| **Fase 1 — MVP financiero** | Sistema en producción con el núcleo: propietarios, propiedades, cuotas, pagos, estados de cuenta, proveedores, servicios, planilla básica, portal propietario | 6–8 semanas |
| **Fase 2 — Operación diaria** | Reservas, accesos, incidencias, comunicados, multas, documentos, presupuesto, dashboard | 6 semanas |
| **Fase 3 — Optimización** | Pagos en línea, conciliación asistida, votaciones, medidores, mejoras de planilla | 4–6 semanas |

**Duración total estimada: 18–22 semanas (~5 meses).**

## 6. Estrategia de puesta en marcha

1. **Migración de datos**: se cargan directamente los Excel reales de la carpeta `Tablas/` (padrón 2026, maestro de entes, abonos desde abril 2021, gastos y vigilancia) según el mapeo del documento [05 — Migración de Datos](05-MIGRACION-DATOS.md), con reporte de cuadre saldo-por-unidad contra el Excel validado por la administración.
2. **Piloto**: 2 semanas con administración + 5–10 propietarios voluntarios antes de abrir a todos.
3. **Onboarding de propietarios**: invitación por correo con enlace de activación; manual de 1 página y video corto.
4. **Corte contable**: se define una fecha de corte; todo pago posterior se registra solo en el sistema.

## 7. Riesgos principales y mitigación

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Datos históricos incompletos o inconsistentes (deudas en disputa) | Alta | Alto | Fase de saneamiento con la administración antes del go-live; saldo inicial validado y firmado por la junta |
| Baja adopción de propietarios (población mayor / poco digital) | Media | Medio | El sistema funciona 100% aunque el propietario no entre; envío de estado de cuenta por correo en PDF |
| Cambios de reglas de negocio a mitad de proyecto (asamblea cambia cuotas/multas) | Media | Medio | Motor de cuotas parametrizable (montos, recargos y conceptos configurables, no hardcodeados) |
| Conectividad limitada en la playa (garita) | Media | Bajo | Módulo de garita tolerante a conexión intermitente; operaciones críticas nunca dependen de garita |
| Alcance creciente ("scope creep") | Alta | Alto | Fases cerradas; todo lo nuevo entra al backlog de la siguiente fase |

## 8. Datos reales del condominio (de los Excel de la administración, carpeta `Tablas/`)

- Entidad: **Asociación de Propietarios del Condominio Residencial de Playa Muelle Azul, RUC 20610523677**.
- **424 lotes** en 4 sectores: MA Central (217), MA Ampliación (149), MA Oeste (31), MA Norte (27); tipos: casa y terreno sin construir.
- Cuota de mantenimiento: S/ 100/mes (2021–2024), **S/ 150/mes** vigente; cobros con **recibo de caja correlativo**.
- Cobranza real: depósito/transferencia **BBVA (~85%)**, **Yape**, efectivo; pagos de varios meses juntos, meses atrasados de años previos y pagos parciales.
- **Morosidad estructural alta**: ~12% de vecinos aporta en un mes típico; deuda registrada desde abril 2021; hubo campaña de regularización "Ponte al Día" (2023).
- Servicios reales: mantenimiento integral tercerizado (~S/ 10,400/mes), **salvavidas por jornada en temporada de verano**, servicio opcional de **vigilancia por propiedad**.
- Detalle completo y plan de carga en [05 — Migración de Datos](05-MIGRACION-DATOS.md).

## 8-bis. Supuestos

- Moneda principal: **Soles (PEN)**, con posibilidad de registrar pagos en USD con tipo de cambio.
- Un solo condominio (no multi-tenant en v1), pero el modelo de datos deja la puerta abierta (`condominio_id` en entidades raíz).
- En v1 los pagos se **registran** (con comprobante adjunto), no se procesan en línea.
- Normativa de referencia: Ley N.º 27157 y reglamento interno del condominio (cuota actual: monto fijo por lote — configurable a alícuota/m² a futuro).

## 9. Equipo sugerido

| Rol | Dedicación |
|---|---|
| Desarrollador full-stack (1–2) | 100% |
| Diseñador UX/UI | 25% (fases 0–1) |
| QA | 25% desde fin de Fase 1 |
| Product Owner (administración del condominio) | 4–6 h/semana para validaciones |

## 10. Criterios de éxito del MVP (Fase 1)

- [ ] La administración emite las cuotas del mes en < 10 minutos.
- [ ] Todo pago registrado impacta el estado de cuenta del propietario en tiempo real.
- [ ] Cada propietario puede ver y descargar su estado de cuenta en PDF.
- [ ] Reporte de morosidad por antigüedad de deuda (30/60/90+ días) disponible.
- [ ] Egresos del mes (proveedores + servicios + planilla) consultables con comprobantes adjuntos.
- [ ] Roles funcionando: un propietario **no puede** ver datos de otro propietario.
