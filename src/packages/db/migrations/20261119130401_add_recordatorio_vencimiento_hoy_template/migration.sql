INSERT OR IGNORE INTO `channels` (`id`, `code`, `name`, `description`, `isSystem`)
VALUES ('chn_whatsapp', 'whatsapp', 'WhatsApp', 'Canal oficial de WhatsApp Cloud API', 1);--> statement-breakpoint
INSERT OR IGNORE INTO `communication_categories` (`id`, `code`, `name`, `isMandatory`)
VALUES ('cat_billing', 'billing', 'Cobranzas y Vencimientos', 0);--> statement-breakpoint
INSERT OR IGNORE INTO `message_templates` (
  `id`,
  `channelId`,
  `categoryId`,
  `code`,
  `name`,
  `subject`,
  `body`,
  `variables`,
  `isSystemBase`
)
SELECT
  'tpl_recordatorio_vencimiento_hoy',
  (SELECT `id` FROM `channels` WHERE `code` = 'whatsapp' AND `deleted_at` IS NULL LIMIT 1),
  (SELECT `id` FROM `communication_categories` WHERE `code` = 'billing' AND `deleted_at` IS NULL LIMIT 1),
  'wa_recordatorio_vencimiento_hoy',
  'recordatorio_vencimiento_hoy',
  'Recordatorio de vencimiento de cuota hoy',
  'Hola {{customer_name}}, te escribimos de parte de {{agency_name}}. Te recordamos que hoy {{expiration_date}} vence la cuota de tu póliza (patente {{plate_number}}).' || char(10) || char(10) || 'Para mantener la vigencia de tu cobertura, podés realizar el pago por los canales habituales. Si ya lo abonaste, por favor desestimá este mensaje.',
  '{"customer_name":"insuredFullName","agency_name":"agencyName","plate_number":"plateNumber","expiration_date":"dueDate"}',
  1
WHERE EXISTS (SELECT 1 FROM `channels` WHERE `code` = 'whatsapp' AND `deleted_at` IS NULL)
  AND EXISTS (SELECT 1 FROM `communication_categories` WHERE `code` = 'billing' AND `deleted_at` IS NULL);
