---
type: concept
producer: oriel
status: draft
created: 2026-08-25T21:19:54.815Z
updated: 2026-08-26
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Inteligencia Artificial

Pipeline de extracción de pólizas. El PAS sube un PDF, se extrae y normaliza con IA, y del resultado se crea la póliza.

```mermaid
sequenceDiagram
    autonumber

    actor pas as PAS
    participant client as Web Client
    participant api as API
    participant storage as Almacenamiento (R2)
    participant queue as Cola de mensajes
    participant extractor as Extractor (IA)
    participant ai as Motor de IA (OCR + LLM)
    participant db as Base de Datos

    pas->>client: Selecciona documento (PDF)
    client->>api: Pide URL de subida
    api-->>client: Devuelve URL firmada
    client->>storage: Sube el binario directo
    storage-->>client: Confirma la subida
    storage-)api: Notifica objeto creado
    api->>db: Registra resultado pendiente (id de extracción)
    api->>storage: Genera URL de acceso temporal (5 min)
    api-)queue: Encola trabajo (id de extracción + URL temporal)
    queue->>extractor: Entrega trabajo (id + URL temporal)
    extractor->>ai: Envía URL al OCR
    ai-->>extractor: Devuelve texto en Markdown
    extractor->>ai: Envía Markdown al LLM
    ai-->>extractor: Devuelve datos estructurados
    extractor-)queue: Encola resultado (id + datos estructurados)
    queue->>api: Entrega resultado
    api->>db: Persiste resultado (on_review) y crea póliza + entidades
    db-->>api: Confirma
```

## Componentes

| Componente | Rol |
|---|---|
| PAS | Productor que carga el documento |
| Web Client | Interfaz web |
| API | Recibe la subida, genera URLs temporales, orquesta el pipeline y persiste el dominio |
| Almacenamiento (R2) | Bucket de documentos |
| Cola de mensajes | Buffer asíncrono entre el API y el extractor |
| Extractor (IA) | Orquesta OCR y LLM sin descargar el binario |
| Motor de IA (OCR + LLM) | Mistral OCR (procesa URL y genera Markdown) + Workers AI (estructura a JSON) |
| Base de Datos | Persistencia del dominio |

## Ciclo de vida

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> processing: encolado
    processing --> on_review: resultado persistido
    on_review --> approved
    on_review --> approved_with_corrections
    on_review --> failed
    approved --> [*]
    approved_with_corrections --> [*]
    failed --> [*]
```

1. **`pending`** — solo con el link. Aún no hay póliza.
2. **`processing`** — en cola, procesando con LLMs.
3. **`on_review`** — resultado persistido; acá se crea la póliza y entidades (cuotas, assets).
4. **`approved` / `approved_with_corrections`** — revisión humana.
5. **`failed`** — terminal tras reintentos.

## Revisión humana

Manual solo al inicio. Con 10+ pólizas de la misma compañía: auto-aprobadas, salvo 5% muestreado.

## Errores

Reintentos automáticos por la cola (at-least-once + idempotencia). Si queda incompleto, el PAS corrige en el cliente sobre la póliza creada. No se re-extrae.
