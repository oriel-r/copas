# Frontmatter Schema Reference

Especificación canónica del bloque YAML frontmatter requerido para todos los documentos del proyecto, conforme a [`meta/template.md`](/meta/template.md).

---

## 1. Bloque Frontmatter Estándar

Todo documento markdown debe iniciar en la línea 1 con delimitadores `---`:

```yaml
---
type: <document_type>
producer: <author_or_agent>
status: <lifecycle_status>
created: <YYYY-MM-DD or ISO-timestamp>
updated: <YYYY-MM-DD or ISO-timestamp>
expires: <YYYY-MM-DD or ISO-timestamp>
deprecatedReason: ""
supersededBy: ""
---
```

---

## 2. Detalle de Campos

| Campo | Tipo | Requerido | Descripción | Valores permitidos / Formato |
|---|---|:---:|---|---|
| `type` | string | **Sí** | Naturaleza del documento según [`meta/types.md`](/meta/types.md). | `concept`, `decision`, `convention`, `guide`, `rules`, `roadmap`, `meta`, `media_script`, `raw_data` |
| `producer` | string | **Sí** | Identidad del autor. | Nombre personal (`Oriel Romero`) o agente (`agent/<model>`, ej. `agent/gemini-2.5-pro`, `agent/claude-3-7-sonnet`) |
| `status` | string | **Sí** | Fase actual del ciclo de vida. | `draft`, `active`, `deprecated`, `superseded`, `archived` |
| `created` | string | **Sí** | Fecha de creación original. No debe modificarse nunca tras su creación. | Formato ISO (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`) |
| `updated` | string | Opcional | Fecha de la última edición de contenido relevante. | Formato ISO (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`). Dejar vacío al crear. |
| `expires` | string | Opcional | Fecha de revisión periódica para mantener la vigencia. | Formato ISO (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`). |
| `deprecatedReason` | string | Condicional | Explicación del porqué el documento ya no es válido o fue reemplazado. | Obligatorio si `status` es `deprecated` o `superseded`. En otros casos usar `""`. |
| `supersededBy` | string | Condicional | Ruta absoluta al documento que lo sustituye. | Obligatorio si `status` es `superseded` (ej. `"/docs/decisiones/nueva-decision.md"`). En otros casos usar `""`. |

---

## 3. Convenciones de Encabezado

Inmediatamente después del bloque de frontmatter, el cuerpo debe comenzar con un encabezado principal único y descriptivo:

```markdown
# Título Descriptivo y Único
```

- Debe titularse en formato claro (evitar `# Titulo temporal` o encabezados genéricos).
- Debe coincidir temáticamente con el nombre del archivo.
