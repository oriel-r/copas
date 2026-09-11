# Implementation Docs

Documentación técnica de arquitectura, convenciones de código e infraestructura.
El conocimiento de negocio vive en [docs/index.md](/docs/index.md).

## Agencias
- [Flujo de Autenticación Admin](/src/docs/agencias/admin-auth.md)
- [Flujo de Onboarding de Agencias](/src/docs/agencias/agency_onboarding.md)

## Comunicaciones
### WhatsApp
- [Servicio WhatsApp](/src/docs/comunicaciones/whatsapp/service.md)
- [Pipeline Inbound WhatsApp](/src/docs/comunicaciones/whatsapp/inbound-pipeline.md)
- [Pipeline Outbound WhatsApp](/src/docs/comunicaciones/whatsapp/outbound-pipeline.md)

### Email
- [Servicio Email](/src/docs/comunicaciones/email/service.md)

## Pólizas
### Extracción con IA
- [Workflow de Extracción IA](/src/docs/polizas/extraccion_ia/workflow.md)
- [Pipeline de Extracción IA (Histórico / Superseded)](/src/docs/polizas/extraccion_ia/pipeline.md)

## Arquitectura
### Convenciones de Módulos
- [Scaffolding de Módulo](/src/docs/arquitectura/convenciones-modulos/module-scaffolding.md)
- [Router de Módulo](/src/docs/arquitectura/convenciones-modulos/module-router.md)
- [Service de Módulo](/src/docs/arquitectura/convenciones-modulos/module-service.md)
- [Repository de Módulo](/src/docs/arquitectura/convenciones-modulos/module-repository.md)

### Core de Aplicación
- [Scaffolding de Aplicaciones](/src/docs/arquitectura/core/scaffolding.md)
- [Entry Point](/src/docs/arquitectura/core/entry-point.md)
- [Routing Global](/src/docs/arquitectura/core/routing.md)
- [Manejo de Errores](/src/docs/arquitectura/core/error-handling.md)
- [Inyección de Dependencias (DI)](/src/docs/arquitectura/core/di.md)
- [Tipos de Variables de Entorno](/src/docs/arquitectura/core/env-types.md)
- [Middlewares Globales](/src/docs/arquitectura/core/global_middlewares.md)
- [Reglas de Ubicación de Archivos](/src/docs/arquitectura/core/files_location_rules.md)

### API
- [Catálogo de Endpoints](/src/docs/arquitectura/api/endpoints.md)
- [Cómo Servir la API](/src/docs/arquitectura/api/how_to_serve.md)

### Infraestructura
- [Catálogo de Colas (Queues)](/src/docs/arquitectura/infra/queues.md)
- [Límites de Workers (Worker Boundaries)](/src/docs/arquitectura/infra/worker-boundaries.md)
- [Tipos de Infraestructura](/src/docs/arquitectura/infra/infra-types.md)
