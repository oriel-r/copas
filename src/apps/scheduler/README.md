Worker de solo lectura: consulta vencimientos por cron y encola recordatorios a
la cola `whatsapp`. No escribe el dominio.

```txt
pnpm --filter scheduler dev
pnpm --filter scheduler deploy
```
