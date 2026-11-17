import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = val
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

loadEnvFile(resolve(process.cwd(), '.env'))

const rawPhone = process.argv[2]
const customText = process.argv.slice(3).join(' ').trim()

if (!rawPhone) {
  console.error('Uso: pnpm --dir infra/waha-proxy run send:test <numero_e164> [mensaje_opcional]')
  console.error('Ejemplo: pnpm --dir infra/waha-proxy run send:test 5491123456789')
  process.exit(1)
}

const port = process.env.PROXY_PORT || process.env.PORT || '8080'
const proxyUrl = (process.env.PROXY_TEST_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, '')
const phoneNumberId = process.env.TEST_PHONE_NUMBER_ID || 'default'
const token = process.env.PROXY_BEARER_TOKEN || ''
const wahaPort = process.env.WAHA_LOCAL_PORT || '3000'

if (!token) {
  console.error('Falta PROXY_BEARER_TOKEN en infra/waha-proxy/.env')
  process.exit(1)
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${proxyUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

console.log(`1) Verificando estado de waha-proxy (${proxyUrl}) y WAHA...`)
let statusRes
try {
  statusRes = await fetchJson('/observability/status')
} catch (err) {
  console.error(`No se pudo conectar a ${proxyUrl}. ¿Levantaste los contenedores con "podman compose up -d"?`)
  console.error(err?.message || err)
  process.exit(1)
}

if (statusRes.status !== 200) {
  console.error('Error consultando /observability/status:', statusRes.status, statusRes.json)
  process.exit(1)
}

const { waha } = statusRes.json
if (!waha?.reachable) {
  console.error('WAHA no responde desde el proxy:', waha?.error)
  process.exit(1)
}

const sessions = Array.isArray(waha.sessions) ? waha.sessions : []
const working = sessions.find((s) => s.status === 'WORKING')
if (!working) {
  console.error('\n⚠️  Ninguna sesión de WAHA está conectada todavía (estado actual):', sessions)
  console.error(`Abrí http://127.0.0.1:${wahaPort} en tu navegador, escaneá el QR y volvé a ejecutar este comando.`)
  process.exit(1)
}

console.log(`   OK - Sesión WAHA activa: ${working.name} (${working.status})`)

const payload = customText
  ? {
      messaging_product: 'whatsapp',
      to: rawPhone,
      type: 'text',
      text: { body: customText },
    }
  : {
      messaging_product: 'whatsapp',
      to: rawPhone,
      type: 'template',
      template: {
        name: 'recordatorio_vencimiento',
        language: { code: 'es_AR' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'customer_name', text: 'Lucas Fernández' },
              { type: 'text', parameter_name: 'agency_name', text: 'Agencia CoPAS Seguros' },
              { type: 'text', parameter_name: 'plate_number', text: 'AE482KM' },
              { type: 'text', parameter_name: 'expiration_date', text: '20/11/2026' },
              { type: 'text', parameter_name: 'amount', text: '48.500,00' },
            ],
          },
        ],
      },
    }

console.log(`2) Enviando mensaje de prueba a ${rawPhone}...`)
const sendRes = await fetchJson(`/v20.0/${encodeURIComponent(phoneNumberId)}/messages`, {
  method: 'POST',
  body: JSON.stringify(payload),
})

if (sendRes.status !== 200) {
  console.error('El proxy rechazó el mensaje:', sendRes.status, sendRes.json)
  process.exit(1)
}

const wamid = sendRes.json?.messages?.[0]?.id
console.log(`   Encolado OK -> wamid: ${wamid}`)
console.log('3) Monitoreando progreso humano en /observability/events...')

const seenEventIds = new Set()
const startedAt = Date.now()
while (Date.now() - startedAt < 45000) {
  const evRes = await fetchJson(`/observability/events?wamid=${encodeURIComponent(wamid)}&limit=50`)
  const items = (evRes.json?.items || []).slice().reverse()
  for (const ev of items) {
    if (seenEventIds.has(ev.id)) continue
    seenEventIds.add(ev.id)
    console.log(`   [${ev.isoTimestamp}] (${ev.eventType}) ${ev.message}`)
  }

  const done = items.some(
    (ev) => ev.eventType === 'waha_dispatched' || ev.eventType === 'job_failed',
  )
  if (done) {
    const failed = items.find((ev) => ev.eventType === 'job_failed')
    if (failed) {
      console.error('\n❌ El envío falló:', failed.message)
      process.exit(1)
    }
    console.log('\n✅ Mensaje despachado a WhatsApp correctamente!')
    process.exit(0)
  }

  await sleep(1000)
}

console.log('\n⏱️  Tiempo de espera agotado; podés seguir viendo eventos con:')
console.log(`curl -H "Authorization: Bearer ${token}" "${proxyUrl}/observability/events?wamid=${wamid}"`)
