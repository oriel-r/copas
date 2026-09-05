# Domain and Types Catalog

Este catálogo define la taxonomía oficial de la documentación del proyecto, basada en [`meta/domains.md`](/meta/domains.md) y [`meta/types.md`](/meta/types.md).

---

## 1. Dominios del Proyecto

Todo documento Markdown en el repositorio debe pertenecer estrictamente a uno de los dominios definidos:

| Dominio | Propósito | Audiencia y Enfoque | Ejemplos | Punto de Entrada |
|---|---|---|---|---|
| `/docs/` | **Negocio / Dominio** | Independiente de la implementación técnica. Conceptos del negocio asegurador, toma de decisiones, arquitectura de alto nivel. | Decisiones arquitectónicas, análisis DER, conceptos de cartera y pólizas. | [`/docs/index.md`](/docs/index.md) |
| `/src/docs/` | **Técnica / Implementación** | Desarrolladores y agentes implementadores. Cómo usar módulos, conventions de código, API routing, infraestructura. | Guías de módulos, DI, middlewares, límites de Cloudflare Workers. | [`/src/docs/index.md`](/src/docs/index.md) |
| `/scripts/` | **Guiones Audiovisuales** | Audiencia no técnica, marketing, comunicación pública (videos, reels, TikTok). | Guiones de explicación de producto, reels explicativos de onboarding. | N/A |
| `/meta/` | **Meta-Documentación** | El sistema de documentación en sí mismo. Reglas sobre cómo se documenta. | Tipos, ciclo de vida, dominios, plantillas. | [`/meta/index.md`](/meta/index.md) |

---

## 2. Tipos de Documentos (`type`)

El campo `type` en el frontmatter debe corresponder exactamente a uno de los tipos admitidos:

| Tipo (`type`) | Pregunta Clave | Descripción | Ubicación Típica |
|---|---|---|---|
| `concept` | *What is X?* | Conceptos atómicos, definiciones de entidades o términos del negocio (ej. PAS, Cartera, Póliza). | `/docs/` |
| `decision` | *Why do we do X?* | Decisiones de negocio, diseño o arquitectura (ADRs). Explica el contexto y por qué se eligió una opción. | `/docs/` o `/src/docs/` |
| `convention` | *How do we do X? (Normas)* | Convenciones de trabajo, estilos de código o metodologías internas. | `/docs/` o `/src/docs/` |
| `guide` | *How do we do X? (Paso a paso)* | Tutoriales y guías paso a paso de uso o integración. | `/src/docs/` o `/docs/` |
| `rules` | *What must/must not be done?* | Reglas normativas, restricciones estrictas y guardrails que no admiten negociación. | `/docs/` o `.agents/rules/` |
| `roadmap` | *Where are we going?* | Planificación de producto, hitos a futuro y estado de iniciativas. | `/docs/` |
| `meta` | — | Documentación sobre el propio sistema de documentación. | `/meta/` |
| `media_script` | — | Guiones estructurados para contenido audiovisual/social. | `/scripts/` |
| `raw_data` | — | Datos en bruto, dumps o información sin procesar para referencia. | `/docs/` |

---

## 3. Reglas de Enlaces Cruzados (Cross-referencing)

1. **Rutas Absolutas desde la Raíz**: Todo enlace interno entre documentos debe usar rutas absolutas que comiencen con `/`:
   - ✅ Correcto: `[Decisión sobre Tailwind](/docs/decisions/use-tailwind.md)`
   - ❌ Incorrecto: `[Decisión sobre Tailwind](../decisions/use-tailwind.md)`
2. **Valor Real**: No agregar enlaces redundantes o triviales. Cada enlace debe aportar contexto relevante al lector.
3. **Mantenimiento del Índice**: Al crear un nuevo documento en `/docs/` o `/src/docs/`, se debe incorporar de inmediato al índice principal respectivo (`/docs/index.md` o `/src/docs/index.md`).
