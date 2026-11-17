ALTER TABLE `channel_endpoints` ADD `connectionStatus` text CHECK(`connectionStatus` IS NULL OR `connectionStatus` IN ('connected', 'waiting_qr', 'disconnected', 'error'));
