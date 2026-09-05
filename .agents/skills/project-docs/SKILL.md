---
name: project-docs
description: Manage, author, validate, and audit project documentation across docs/, src/docs/, scripts/, and meta/. Use when creating new markdown documentation, choosing document types or domains, updating document lifecycle states (draft, active, deprecated, superseded, archived), auditing expired docs, or verifying YAML frontmatter and cross-reference links according to meta/ standards.
---

# Project Documentation Management Skill

Este skill guía la creación, clasificación, mantenimiento de ciclo de vida y validación de toda la documentación del repositorio, garantizando el cumplimiento estricto del sistema definido en [`meta/`](/meta/index.md).

---

## Cuándo usar este skill

Activa o consulta este skill cuando:
- Necesites redactar un nuevo documento de negocio, decisión, guía, convención o guión.
- Tengas dudas sobre en qué carpeta ubicar un archivo (`docs/`, `src/docs/`, `scripts/` o `meta/`).
- Debas definir el tipo de documento (`concept`, `decision`, `convention`, `guide`, etc.).
- Vayas a modificar un documento existente (actualizar su fecha `updated`, cambiar su estado de borrador a activo, marcarlo como obsoleto o sustituido).
- Requieras auditar o validar la integridad de los enlaces y frontmatter de los documentos.

---

## Referencias Rápidas

- **Taxonomía y Dominios**: [domain-and-types-catalog.md](./references/domain-and-types-catalog.md)
- **Estados y Ciclo de Vida**: [lifecycle-workflows.md](./references/lifecycle-workflows.md)
- **Esquema de Frontmatter**: [frontmatter-schema.md](./references/frontmatter-schema.md)
- **Script de Validación**: [validate-docs.mjs](./scripts/validate-docs.mjs)

---

## Procedimiento Paso a Paso

### Fase 1: Identificación de Dominio y Tipo

Antes de escribir una sola línea, determina:
1. **El Dominio**:
   - Negocio / Modelo de dominio / Decisiones generales ➔ `/docs/`
   - Código / Arquitectura técnica / Uso de APIs / Módulos ➔ `/src/docs/`
   - Guiones audiovisuales (TikTok, Reels, Videos) ➔ `/scripts/`
   - Sistema de documentación ➔ `/meta/`
2. **El Tipo (`type`)**:
   - Consulta [domain-and-types-catalog.md](./references/domain-and-types-catalog.md). ¿El documento responde a *What is X?* (`concept`), *Why?* (`decision`), *How?* (`convention` o `guide`), o *Rules?* (`rules`).

---

### Fase 2: Creación y Maquetado

#### Opción A: Usando el Generador Plop (Recomendado)
Ejecuta en la terminal:
```bash
pnpm gen doc
```
Responde las preguntas interactivas (ruta relativa, tipo, autor, estado).

#### Opción B: Creación Directa
Si se crea directamente el archivo markdown, debe comenzar obligatoriamente con el bloque frontmatter canónico:

```yaml
---
type: <concept|decision|convention|guide|rules|roadmap|meta|media_script|raw_data>
producer: <Nombre del autor o agent/<model-name>>
status: draft
created: <YYYY-MM-DD>
updated:
expires: <YYYY-MM-DD>
deprecatedReason: ""
supersededBy: ""
---

# Título Descriptivo y Específico

Cuerpo del documento...
```

*Nota: Consulta [frontmatter-schema.md](./references/frontmatter-schema.md) para detalles de cada campo.*

---

### Fase 3: Gestión del Ciclo de Vida

Consulta [lifecycle-workflows.md](./references/lifecycle-workflows.md). Reglas clave:

1. **Fuente de Verdad**:
   - Solo los documentos con `status: active` son fuente de verdad canónica.
   - Si un documento está en `draft`, debe advertirse que no está finalizado.
   - Si está en `deprecated`, `superseded` o `archived`, **no debe tomarse como referencia técnica o de negocio**.

2. **Ediciones de Contenido**:
   - Siempre que se haga un cambio significativo en el contenido de un documento, actualizar el campo `updated: YYYY-MM-DD` (o timestamp ISO).

3. **Retirar o Reemplazar Documentos**:
   - **Para dar de baja sin reemplazo**:
     - `status: deprecated`
     - `deprecatedReason: "Motivo concreto de la desaprobación"`
   - **Para reemplazar por un nuevo documento**:
     - `status: superseded`
     - `deprecatedReason: "Reemplazado por nueva arquitectura/diseño"`
     - `supersededBy: "/docs/ruta/absoluta/al/nuevo_doc.md"`

---

### Fase 4: Enlaces Cruzados e Índices

1. **Enlaces**: Utilizar siempre rutas absolutas desde la raíz del proyecto:
   ```markdown
   Ver [Análisis del DER](/docs/sistemas/der_analisis.md) para más detalles.
   ```
2. **Índices**: Al crear un nuevo documento dentro de `/docs/` o `/src/docs/`, incorporarlo al índice correspondiente ([`/docs/index.md`](/docs/index.md) o [`/src/docs/index.md`](/src/docs/index.md)).

---

### Fase 5: Validación y Auditoría

Ejecuta el script de validación para certificar que no haya errores de formato, campos faltantes o enlaces rotos:

```bash
node .agents/skills/project-docs/scripts/validate-docs.mjs
```

Para validar un archivo o carpeta específica:
```bash
node .agents/skills/project-docs/scripts/validate-docs.mjs docs/
```

Si el script reporta errores, corrígelos antes de finalizar la tarea.
