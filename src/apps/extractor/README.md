Adapter de extracción: recibe claves de R2 por la cola `ai`, llama al servicio
externo de IA y devuelve JSON por `ai-result`. No escribe el dominio.

```txt
pnpm --filter extractor dev
pnpm --filter extractor deploy
```
