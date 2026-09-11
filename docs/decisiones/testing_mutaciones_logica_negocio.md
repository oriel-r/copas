---
type: decision
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-11
updated:
expires: 2027-09-11
deprecatedReason: ""
supersededBy: ""
---

# Decisión: Testing de Mutaciones Enfocado en Lógica de Negocio Real

Define la estrategia arquitectónica, configuración y criterios de diseño de pruebas de mutación (Stryker) en Copas para garantizar que los tests validen reglas de dominio reales e invariantes del negocio en lugar de perseguir mutantes artificiales en código defensivo o infraestructura.

---

## 1. Contexto y Planteo del Problema

Anteriormente, Stryker operaba con un alcance indiscriminado (`mutate: ["src/**/*.ts"]`). Esto provocaba que se generaran miles de mutantes sobre:
- Consultas SQL y constructores de Drizzle en repositorios (`*.repository.ts`).
- Enrutadores y adaptadores HTTP de Hono (`*.routes.ts`).
- Bindings de plataforma y Cloudflare Workers (`platform/**/*.ts`, `src/index.ts`).
- Contenedores de inyección de dependencias (`src/core/di.ts`, `*.module.ts`).
- Cadenas opcionales defensivas (`?.`), literales de mensajes de error y llamadas de logging.

### La Consecuencia: La Ley de Goodhart en Testing
Cuando una métrica se convierte en el objetivo, deja de ser una buena métrica. Al buscar maximizar ciegamente el puntaje de mutación sobre capas de infraestructura o código defensivo:
1. Se escribían pruebas artificiales acopladas a la implementación interna (ej. llamar handlers forzando `ctx === undefined` o `ctx = {}` para matar mutantes en `ctx && ctx.waitUntil`).
2. Se comprobaban cadenas exactas de mensajes de error o logs (`logger.info`), haciendo las pruebas frágiles ante cambios menores de redacción.
3. Se desperdiciaba tiempo de CI y desarrollo persiguiendo mutantes en código que no contiene reglas de negocio, mientras que las reglas reales de seguros (cálculo de cuotas, carencias, vencimientos y estados) quedaban desatendidas.

---

## 2. Decisión Tomada: Los Cuatro Pilares

Adoptamos un enfoque **Domain-Centric Mutation Testing** basado en cuatro pilares:

### Pilar 1: Alcance de Mutación Preciso en la Capa de Dominio
- **Foco exclusivo en Servicios de Negocio**: La directiva `mutate` de Stryker se restringe a `src/modules/**/*.service.ts`, motores de cálculo, máquinas de estado y orquestadores.
- **Exclusión de Infraestructura y Adaptadores**:
  - `*.repository.ts`: Se validan mediante tests de integración con SQLite/D1 en memoria o fakes de contrato. Mutar queries SQL de Drizzle genera mutantes espurios.
  - `*.routes.ts`: Se validan mediante tests de endpoints HTTP (contrato de rutas).
  - `platform/**`, `src/core/**`, `*.module.ts`: Fontanería de framework excluida de mutación.
- **Frontend (`client`)**: Se excluyen componentes JSX/TSX visuales (`src/**/*.tsx`) y estilos CSS; la mutación se concentra exclusivamente en utilidades puras de cliente (`src/lib/**/*.ts`).

### Pilar 2: Supresión de Mutadores Ruidosos y Plugin Ignorer AST
- **Mutadores Desactivados Globalmente**:
  - `OptionalChaining` (`?.` $\rightarrow$ `.`): En TypeScript tipado, las cadenas opcionales son navegación segura. Como los contratos de dominio suministran objetos válidos, mutar `a?.b` a `a.b` forzaba tests con `undefined` fuera de contrato solo para provocar TypeErrors.
  - `StringLiteral`: Excluido para evitar mutar textos de error o literales de configuración. Los tests deben verificar códigos de error (`ERR_...`) o clases de dominio (`PolicyNotFoundError`), no textos literales.
- **Plugin AST Ignorer Centralizado (`scripts/stryker-ast-ignorer.mjs`)**:
  - Detecta e ignora automáticamente todas las llamadas de logging (`logger.info`, `logger.error`, `console.log`, etc.).
  - Omite textos de `throw new Error(...)`.
  - Omite comprobaciones de duck-typing y guardas en tiempo de ejecución (`typeof x === ...`, `x instanceof Y`).

### Pilar 3: Eliminación de Trampas de Mutantes en Producción
- **Constructores Estrictos**: Eliminar malabarismos de parámetros (dualidad objeto vs argumentos posicionales con `typeof === "object"` y fallbacks `??`) en los servicios de negocio.
- **Aislamiento Justificado**: Donde la normalización o caídas de plataforma sean indispensables en el borde del sistema, se aíslan mediante comentarios formales:
  ```typescript
  // Stryker disable all: DI parameter normalization adapter
  function resolveDependencies(...) { ... }
  // Stryker restore all
  ```
- O directivas por línea con justificación obligatoria:
  ```typescript
  // Stryker disable next-line [Mutator]: [Motivo concreto de plataforma/runtime]
  ```

### Pilar 4: Guías de Testing para QA y Desarrolladores
- **Regla de Oro**: Un test NUNCA se escribe con el objetivo de matar un mutante.
- **Criterio de Evaluación de Mutantes Vivos**:
  1. ¿Representa el mutante un caso no probado de las **reglas de negocio, cálculos o invariantes** según las especificaciones?
  2. **SÍ**: Se diseña un caso de prueba de comportamiento basado en la especificación (ej. `it("calcula la cuota con recargo financiero cuando el método es financiado")`).
  3. **NO** (es código defensivo, detalle de fontanería o mutante equivalente): Se reporta o se ignora con directiva justificada; **nunca se crea un test artificial**.
- **Umbral Objetivo**: Se fija un umbral realista de **80% a 85% de mutación enfocado 100% en la capa de negocio**, en vez de un 100% ciego en capas irrelevantes.

---

## 3. Consecuencias y Beneficios

1. **Alineación con el Negocio**: La suite de pruebas garantiza que si alguien altera una regla de cálculo de cuotas, una transición de póliza o un filtro de consentimiento, los tests fallarán inmediatamente.
2. **Tests Limpios y Mantenibles**: Los tests dejan de tener mocks retorcidos o casos de prueba disparatados creados solo para satisfacer al motor de mutación.
3. **Velocidad y Eficiencia**: En `api`, el universo de mutación se redujo de 158 archivos a 18 servicios de dominio, eliminando cientos de falsos supervivientes en repositorios y ejecutando la suite de forma determinista y ágil.
4. **Claridad para QA**: El rol de QA opera con total confianza bajo el paradigma de caja negra / contratos, sabiendo que el reporte de Stryker señala vacíos de especificación reales y no detalles internos de implementación.

---

## Ver también

- [Documentación Técnica de Convenciones](/CONVENTIONS.md)
- [Module Service](/src/docs/module-conventions/module-service.md)
- [Topología de Servicios](/docs/servicios/topologia_de_servicios.md)
