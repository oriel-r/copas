---
type: raw_data
producer: agent/kimi-k3
status: draft
created: 2026-08-17
updated:
expires: 2026-09-17
deprecatedReason: ""
supersededBy: ""
---

# Análisis del DER de COPAS

Análisis de [der.md](der.md). Alcance: modelo de datos para SaaS multi-tenant de PAS
(productores asesores de seguros), cuyo núcleo de valor es automatizar recordatorios
de vencimientos y renovaciones por WhatsApp/email
(ver `docs/vencimientos_y_renovaciones/`).

El modelo está pensado para implementarse en **Cloudflare D1 (SQLite)** con
**Drizzle ORM**. Por eso este informe separa:

- **Modelado** (secciones 1–4): decisiones conceptuales/relacionales, independientes
  del motor.
- **Implementación** (sección 5): convenciones y constraints propias de SQLite/D1.
- **Divergencias** con el esquema ya implementado (sección 6).
- **Cambios propuestos** priorizados para un DER v2 (sección 7).

---

## 1. Fortalezas

- **Multi-tenancy disciplinado**: casi toda tabla de dominio lleva `organization_id`
  → apto para aislamiento de tenants y Row-Level Security si se adoptara.
- **Capa de auth completa** (better-auth): `user/account/session/verification` con
  expiraciones de tokens y scopes.
- **Planes versionados** (`plan_versions` + `plan_version_features`) y **overrides por
  suscripción** (`subscription_feature_overrides`) → pricing flexible sin reescribir
  históricos.
- **Estados como log de eventos** (`notification_statuses`, `message_statuses`) en vez
  de updates destructivos → trazabilidad de entregas vía webhooks.
- **Pagos parciales soportados**: `policy_installments` 1:N
  `policy_installment_payments` → una cuota puede cobrarse en varios pagos.
- **Cadena de renovación** de pólizas con `renewed_from_policy_id` (self-FK).
- **Compliance pensado**: `communication_consents` (opt-out) y `deduplication_hash`
  en notificaciones.
- **Assets flexibles** (`asset_types.property_definition` + `assets.properties`) →
  múltiples ramos sin cambios de esquema.
- **Templates base del sistema con override por organización**
  (`organization_message_templates.custom_overrides`).
- **Separación canales/endpoints/números** (`channels`, `channel_endpoints`,
  `organization_channel_numbers`) → soporta pool de números de WhatsApp.
- **Trazabilidad de creación**: `user_id` presente en tablas de dominio.

---

## 2. Debilidades del modelo

1. **Sin claves únicas en tablas join**: `member(user_id, organization_id)`,
   `policy_assets(policy_id, asset_id)`, `plan_version_features`,
   `organization_message_templates`, `organization_notification_preferences`,
   `communication_consents` → la DB no impide duplicados.
2. **Dominios no declarados**: `status`, `role`, `interval`, `billing_frequency`,
   `method_type`, `channel_usage`, `campaign_origin`, `provider`, etc. no listan sus
   valores permitidos → el modelo no comunica ni restringe su dominio.
3. **`updated_at` ausente** en la mayoría de entidades mutables (`policies`,
   `insureds`, `assets`, `policy_installments`, `organization`…). Tampoco existe
   **soft-delete** (`deleted_at`) en ninguna tabla.
4. **Denormalización sin protección**: `organization_id` + `user_id` repetidos en
   `insureds`, `assets`, `policies`, `policy_installments`; `organization_channel_id`
   + `organization_channel_number_id` en `conversations`. Sin FKs compuestas, pueden
   divergir de la entidad padre.
5. **`user_id` ambiguo**: en `insureds/assets/policies/policy_installments` parece
   auditoría ("quién lo registró") pero no se distingue de ownership. Conviene
   renombrar a `created_by` o documentar la semántica.
6. **Moneda inconsistente**: `subscription_payments` declara `currency`, pero
   `policy_installments` y `policy_installment_payments` manejan dinero sin moneda.
7. **Credenciales sin estrategia de seguridad**: `organization_integrations.credentials`
   como `text` sin declarar cifrado → riesgo (tokens de WhatsApp Cloud API).
8. **Inconsistencias de naming**: singular (`user`, `account`, `session`) vs plural
   (todo lo demás); `assigned_at` vs `created_at`;
   `messages.referenced_entity_id` **sin** `referenced_entity_type` (rompe el patrón
   type/id usado en el resto del modelo).
9. **Sin declaración de comportamiento de borrado** (`ON DELETE`) en ninguna relación.

---

## 3. Posibles errores indeseados (integridad en runtime)

| # | Riesgo | Causa |
|---|--------|-------|
| 1 | Dos organizaciones usando **el mismo número de WhatsApp** simultáneamente | `organization_channel_numbers.endpoint_id` sin constraint de asignación única activa |
| 2 | **Múltiples números "primarios"** por canal | `is_primary` sin unique parcial |
| 3 | Pagar una cuota con un **método de pago de otra póliza** | `policy_installment_payments` referencia installment (→póliza A) y payment_method (→póliza B) sin FK compuesta |
| 4 | `paid_amount`/`status` de la cuota **divergen de la suma real de pagos** | campos desnormalizados sin mecanismo de consistencia |
| 5 | Notificación con **template de un canal y `organization_channel` de otro** (o categoría distinta a la del template) | redundancia `channel/template/category` sin validación cruzada |
| 6 | `policy_assets` incluye **assets de un asegurado distinto** al de la póliza, o de otra organización | sin FK compuesta `(policy_id, insured_id)` |
| 7 | Cuotas/pagos con `organization_id` distinto al de su póliza → **fuga cross-tenant** | denormalización sin FK compuesta |
| 8 | `deduplication_hash` **no deduplica** | no es UK |
| 9 | Ciclos o ramificaciones de renovación (A renueva de B y B de A; una póliza "renovada" dos veces) | self-FK sin restricciones |
| 10 | `covered_from/until` fuera del rango de la póliza; `period_end < period_start` | sin CHECKs de rango |
| 11 | `session.active_organization_id` apuntando a una org donde el user **no es miembro** | sin FK compuesta con `member` |
| 12 | Invitaciones duplicadas pendientes al mismo email/org | sin UK parcial |
| 13 | `insureds` duplicados dentro de una org | sin UK `(organization_id, cuit)` |
| 14 | Estados fuera de orden por webhooks concurrentes | sin modelo de transiciones ni control de versión de estado |
| 15 | Una org con **varias suscripciones activas** | sin unique parcial sobre `status` |

---

## 4. Fallos de modelado

1. **`subscriptions` apunta a `plans`, no a `plan_versions`** — toda la maquinaria de
   versionado queda decorativa: al cambiar el precio del plan, las suscripciones
   históricas cambian de significado. Falta además snapshot de precio al suscribir.
2. **`session.active_team_id` referencia una entidad `team` que no existe** en el
   diagrama → FK muerta (falta `team`/`team_member` o sobra el campo).
3. **La póliza no tiene número de póliza** — el identificador de negocio por
   excelencia (`policy_number` + UK por compañía/org). Tampoco hay **prima total** ni
   **suma asegurada**: no se puede validar `Σ cuotas = prima` ni registrar cobertura.
4. **`insureds` sin email ni dirección** — en un producto cuyo núcleo es notificar al
   asegurado, el contacto queda solo en `recipient_address` denormalizado de cada
   notificación.
5. **No existe modelo para el feature central del producto**: reglas de recordatorio
   programado ("avisar 10/5/2 días antes del vencimiento de cuota, 30 antes de
   renovación"). `notification_campaigns.metadata` es un cajón de sastre. La
   arquitectura (cola + servicio de consulta programada) no tiene tablas que la
   sostengan (schedules/reglas/outbox).
6. **No hay entidad de documentos/archivos ni resultados de análisis IA** — la
   arquitectura incluye bucket + motor de IA que lee pólizas, pero solo existe
   `policies.document_url` (un solo archivo, sin estado de extracción ni resultados).
7. **Relación org ↔ compañías ausente**: `companies` y `branches` son catálogos
   globales, pero cada PAS trabaja con ciertas aseguradoras y tiene un **código de
   productor distinto en cada una** → falta `organization_companies` (con
   `producer_code`). Tampoco hay vínculo `company ↔ branch` (qué ramos ofrece cada
   compañía).
8. **Dos modelos de comunicación desconectados**: `notifications` (log outbound) y
   `conversations/messages` (hilo) no tienen puente. Cuando el asegurado responde
   "ya pagué" al recordatorio, no hay forma robusta de ligar la conversación a la
   notificación que la originó (solo el polimórfico `related_entity_type/id`).
9. **Asimetría de consentimiento**: preferencias de org son por `(categoría, canal)`,
   pero consentimientos del asegurado son solo por `categoría` → no se puede expresar
   "opt-out de WhatsApp pero sí email" para la misma categoría.
10. **Polimorfismo sin integridad referencial** en `recipient_*`, `related_entity_*`,
    `entity_type/entity_id`, `sender_*`, `owner_*`, `primary_entity_*` → la DB no
    puede garantizar nada; cualquier DELETE deja referencias colgadas.
11. **Póliza sin historial de estados** — criterio inconsistente: notificaciones
    tienen log de estados, pero `policies.status` (vigente → morosa → baja → renovada)
    es un update destructivo, justo donde el historial tiene valor de negocio.
12. **`conversations.primary_entity_*` redundante con `conversation_entities`** → dos
    fuentes de verdad divergibles.
13. **Falta comprobante en pagos de cuotas** — el planteo del problema menciona Pago
    Fácil/Rapipago; `policy_installment_payments` solo tiene `notes` (sin
    `receipt_url`, sin `gateway_transaction_id`, a diferencia de
    `subscription_payments` — inconsistencia de criterio).

---

## 5. Consideraciones de implementación (Cloudflare D1 / SQLite)

Estas observaciones **no son fallos de modelado**: son decisiones de implementación
condicionadas por el motor. Se separan deliberadamente del análisis conceptual.

### 5.1 Reclasificación de ítems del análisis conceptual

| Ítem | Reclasificación |
|---|---|
| "Fechas como `text`" | **No es fallo en SQLite** (no existe tipo DATE nativo). Es una convención a definir: ISO8601 text **o** epoch integer. El problema real es la divergencia DER↔implementación (ver §6). |
| "Booleanos como `integer`" | Idiomático en SQLite (no hay BOOLEAN). Falta `CHECK (col IN (0,1))`. |
| "Enums como texto libre" | SQLite no tiene ENUM. La vía es `text` + `CHECK IN (...)` o tabla lookup. Lo que queda en modelado: declarar los dominios (§2.2). |
| "Dinero como `numeric`" | **Riesgo real de implementación**: la afinidad NUMERIC de SQLite puede almacenar como REAL (float) → errores de redondeo. Decidir: `integer` en centavos (recomendado) o decimal exacto como `text`. Aplica a `plans`, `plan_versions`, `subscriptions`, `policy_installments` y todas las tablas `*_payments`. |

### 5.2 Convenciones canónicas de tipo (fijar antes de escribir migraciones)

- **Timestamps de sistema** (`created_at`, `updated_at`, `sent_at`, …): `integer`
  epoch ms — convención ya usada por better-auth en `code/packages/auth-db`
  (`timestamp_ms` de Drizzle).
- **Fechas de negocio** (`birth_date`, `start_date`, `end_date`, `due_date`):
  formato único (date-only `YYYY-MM-DD` o epoch) y timezone explícita (ART, UTC-3,
  sin DST). Los recordatorios dependen de comparar fechas correctamente.
- **Booleanos**: `integer` 0/1 + `CHECK IN (0,1)` (Drizzle: `mode: 'boolean'`).
- **Dinero**: `integer` en unidad mínima + `currency` ISO 4217 en **todas** las
  tablas monetarias (hoy las cuotas/pagos de póliza no tienen moneda).
- **JSON** (`metadata`, `config`, `properties`, `limits`, `variables`,
  `custom_overrides`, `credentials`): `text` + `CHECK (json_valid(col))`; validación
  de forma en capa app (Zod/Drizzle).
- **IDs**: `text` generados en app (consistente con better-auth). Elegir ULID
  (ordenable, útil para paginación por cursor) o nanoid (no ordenable). Uno solo.

### 5.3 Constraints: decidirlas ahora, porque SQLite no permite cambiarlas después

- `ALTER TABLE` de SQLite es limitado (no agrega ni quita CHECKs ni FKs): modificar
  constraints = **recrear la tabla**. Todo lo de §3 (UKs en joins, unique parciales,
  FKs compuestas, `deduplication_hash` UK) debe entrar en la **primera migración**.
- **FKs compuestas** (la cura de los riesgos cross-tenant §3.3/§3.6/§3.7): SQLite las
  soporta, pero exigen `UNIQUE` en el padre sobre las mismas columnas (ej.
  `UNIQUE(id, organization_id)` en `policies`). Costo aceptable, beneficio alto.
- **Índices parciales** (`WHERE status = 'active'`): soportados por SQLite y por
  Drizzle (`.where()` en `uniqueIndex`) → resuelven "una suscripción activa por org"
  y "un número primario por canal".
- D1 **enforcea FKs por defecto** (equivale a `PRAGMA foreign_keys = on`; documentado
  en https://developers.cloudflare.com/d1/sql-api/foreign-keys/) y permite
  `PRAGMA defer_foreign_keys = on` durante migraciones. Definir `ON DELETE` por
  relación: la implementación auth usa `cascade`; para el dominio de seguros
  probablemente convenga `RESTRICT` en pólizas/cuotas + soft-delete.

### 5.4 Costos y límites operativos de D1 que impactan el diseño

- D1 factura por **filas leídas/escritas**: los FKs no se indexan solos → un índice
  por FK y por patrón de consulta (`organization_id + status`, `due_date` para el
  scheduler, `deduplication_hash`). Cada índice suma una escritura por fila.
- Escritura single-writer por DB y sin locks largos → el scheduler de recordatorios
  debe ser **idempotente por constraint** (dedup UK + `INSERT OR IGNORE`), no por
  locks.
- Límites de CPU/tamaño por query → el job de vencimientos debe procesar por **lotes
  paginados**, no scans completos.
- **STRICT tables** y **triggers**: recomendables (STRICT para tipado real; triggers
  para `updated_at` y consistencia de `paid_amount`), pero **verificar soporte vigente
  en D1** antes de adoptarlos. La alternativa segura es enforcement en capa Drizzle
  (`$onUpdate`, ya usado en auth) + transacciones en el servicio.

---

## 6. Divergencias DER ↔ implementación existente (`code/packages/auth-db`)

El esquema Drizzle ya implementado difiere del DER:

1. **Timestamps**: el DER declara `text`; la implementación usa `integer` epoch ms en
   todas las tablas auth.
2. **`session.active_team_id` no existe** en la implementación (tampoco hay tabla
   `team`) → confirma la FK muerta señalada en §4.2.
3. **Campos en implementación ausentes del DER**: `user.role`, `user.banned`,
   `user.ban_reason`, `user.ban_expires`, `session.impersonated_by`, tabla
   **`rate_limit`** completa, `organization.updated_at`.
4. **`member` sin UK `(user_id, organization_id)`** en ambos lados → corregir en DER
   y en migración real.
5. Decisión pendiente: declarar el DER **canónico** y sincronizarlo, o aclarar que
   las tablas auth quedan fuera de su alcance (generadas por better-auth).

---

## 7. Cambios propuestos para DER v2 (priorizados)

### P0 — Críticos de dominio (bloquean el core del producto)

1. `subscriptions.plan_id` → `plan_version_id` (FK a `plan_versions`) + snapshot de
   precio/moneda al momento de suscribir.
2. `policies`: agregar `policy_number` (UK por `company_id`+`organization_id`),
   `premium_total`, `currency`.
3. Nueva entidad de **reglas de recordatorio** (ej. `reminder_rules`:
   organization_id, event_source [installment_due | policy_renewal], offsets en días,
   channel/template, activa) + persistencia de ejecución idempotente (apoyarse en
   `deduplication_hash` con UK).
4. Nueva entidad **documentos** (policy_id, file_url, kind, upload_status) +
   resultados de análisis IA (extraction_status, extracted_fields, confidence).
5. Resolver `session.active_team_id`: eliminarlo o agregar `team`/`team_member`.
6. `insureds`: agregar `email` (y evaluar `address`); UK
   `(organization_id, cuit)`.
7. Nueva entidad `organization_companies` (organization_id, company_id,
   `producer_code`) + vínculo `company ↔ branch` si aplica al dominio.

### P1 — Integridad referencial y consistencia

8. UKs en todas las join: `member(user_id, organization_id)`,
   `policy_assets(policy_id, asset_id)`,
   `plan_version_features(plan_version_id, feature_id)`,
   `organization_message_templates(organization_id, template_id)`,
   `organization_notification_preferences(organization_id, category_id, channel_id)`,
   `communication_consents(organization_id, insured_id, category_id)`.
9. Unique parciales: suscripción activa única por org; `is_primary` único por
   `organization_channel`; endpoint con asignación activa única en
   `organization_channel_numbers`; `deduplication_hash` UK por org.
10. FKs compuestas same-tenant: `policy_assets`→`(policies)` con insured/org
    consistente; `policy_installments`→`policies`; `policy_installment_payments` con
    installment y payment_method de la **misma póliza**; `conversations` con
    channel/number coherentes; `notifications` con channel/template/category
    coherentes.
11. Puente notifications↔conversations: `notifications.conversation_id` nullable o
    tabla puente.
12. `communication_consents` por `(insured, category, channel)` para paridad con las
    preferencias de org.
13. Historial de estados de póliza (`policy_statuses`) al estilo de
    `notification_statuses`.
14. Declarar dominios (valores permitidos) de todos los campos `status/role/type/
    interval/…` y `ON DELETE` de cada relación.
15. `messages.referenced_entity_id` → agregar `referenced_entity_type`.
16. Renombrar `user_id` → `created_by` en tablas de dominio (o documentar semántica).
17. Elegir una sola fuente de verdad entre `conversations.primary_entity_*` y
    `conversation_entities`.

### P2 — Higiene del modelo

18. `updated_at` en todas las entidades mutables; `deleted_at` donde aplique
    (`insureds`, `assets`, `policies`, …).
19. `policy_installment_payments`: agregar `receipt_url` (comprobante Pago
    Fácil/Rapipago).
20. `policy_installments`: agregar `installment_number`.
21. `currency` en cuotas/pagos de póliza (o declarar ARS por defecto a nivel modelo).
22. Normalizar naming singular/plural de tablas.
23. Definir estrategia de cifrado para `organization_integrations.credentials`
    (no almacenar en texto plano).
