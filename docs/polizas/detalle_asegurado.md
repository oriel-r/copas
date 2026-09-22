---
type: concept
producer: oriel
status: active
created: 2026-09-22
updated:
expires: 2027-09-22
deprecatedReason: ""
supersededBy: ""
---

# Detalle de Asegurado

Ficha operativa unificada (Drawer lateral) para consultar y actualizar perfil, pólizas y cuotas de un asegurado sin abandonar la pantalla activa.

## Accesos y Navegación

- **Cartera (`/cartera`)**: Click sobre cualquier fila de asegurado.
- **Inicio (`/dashboard`)**: Click sobre el asegurado en la tabla de cuotas por vencer.
- **Enlace directo**: Sincronizado vía URL `?insuredId=<id>`. El botón atrás del navegador cierra el panel.

## Carga de Información (Estrategia Lazy)

1. **Apertura**: Carga ficha personal, métricas de cartera (`activePoliciesCount`, `totalPoliciesCount`) y la última póliza activa.
2. **Historial de Pólizas**: Carga diferida bajo demanda al solicitar "Ver más pólizas".
3. **Cuotas**: Carga diferida bajo demanda al desplegar el acordeón de cuotas de una póliza específica.

## Reglas de Negocio y Edición

### 1. Asegurado
- **Identificador Fiscal**: El CUIT es único por organización. Modificaciones que colisionen con otro asegurado existente retornan error de conflicto (409).
- **Campos Editables**: Nombre completo, CUIT, teléfono, email y fecha de nacimiento.

### 2. Pólizas
- **Estados**: `active` (activa), `expired` (vencida), `cancelled` (cancelada).
- **Vigencia**: La fecha de inicio (`startDate`) debe ser anterior o igual a la fecha de fin (`endDate`).
- **Campos Editables**: Estado, número de póliza, fechas de vigencia, prima total y moneda.

### 3. Cuotas
- **Estados**: `pending` (pendiente), `paid` (pagada), `overdue` (vencida).
- **Operación del PAS**: Transición directa de estado (`pending` <-> `paid`) para registrar cobranza.

## Alcance y Restricciones
- La eliminación física (borrado) de asegurados o pólizas está bloqueada en esta vista para prevenir pérdida involuntaria de datos históricos.
