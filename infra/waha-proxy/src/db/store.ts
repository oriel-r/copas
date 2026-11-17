import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type {
  MessageMappingRow,
  OutboundAction,
  OutboundJobRow,
  ProxyEventLevel,
  ProxyEventRecord,
  ProxyEventRow,
  QueueStats,
  QueueStatusCounts,
} from '../types.ts'

export type EnqueueJobInput = {
  id: string
  wamid: string
  phoneNumberId: string
  wahaSession: string
  recipientPhone: string
  chatId: string
  action: OutboundAction
}

export type RecordEventInput = {
  level: ProxyEventLevel
  category: string
  wahaSession?: string | null
  wamid?: string | null
  jobId?: string | null
  eventType: string
  message: string
  details?: Record<string, unknown>
}

function emptyCounts(): QueueStatusCounts {
  return {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  }
}

function clampLimit(limit: number | undefined, fallback = 50): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return fallback
  return Math.max(1, Math.min(200, Math.floor(limit)))
}

export class ProxyStore {
  private readonly db: DatabaseSync

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true })
    }
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec('PRAGMA busy_timeout = 5000;')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outbound_jobs (
        id TEXT PRIMARY KEY,
        wamid TEXT NOT NULL UNIQUE,
        phone_number_id TEXT NOT NULL,
        waha_session TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        waha_message_id TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_outbound_jobs_session_status
        ON outbound_jobs (waha_session, status, created_at);

      CREATE TABLE IF NOT EXISTS message_mappings (
        wamid TEXT PRIMARY KEY,
        waha_message_id TEXT NOT NULL UNIQUE,
        phone_number_id TEXT NOT NULL,
        waha_session TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_message_mappings_waha_id
        ON message_mappings (waha_message_id);

      CREATE TABLE IF NOT EXISTS proxy_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        waha_session TEXT,
        wamid TEXT,
        job_id TEXT,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        details_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_proxy_events_wamid_ts
        ON proxy_events (wamid, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_proxy_events_session_ts
        ON proxy_events (waha_session, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_proxy_events_ts
        ON proxy_events (timestamp DESC);
    `)
  }

  resetStuckProcessingJobs(): number {
    const now = Date.now()
    const stmt = this.db.prepare(
      `UPDATE outbound_jobs SET status = 'queued', updated_at = ? WHERE status = 'processing'`,
    )
    const info = stmt.run(now)
    return Number(info.changes ?? 0)
  }

  enqueueJob(input: EnqueueJobInput): OutboundJobRow {
    const now = Date.now()
    const payloadJson = JSON.stringify(input.action)
    this.db
      .prepare(
        `INSERT INTO outbound_jobs (
          id, wamid, phone_number_id, waha_session, recipient_phone, chat_id,
          action_type, payload_json, status, attempts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
      )
      .run(
        input.id,
        input.wamid,
        input.phoneNumberId,
        input.wahaSession,
        input.recipientPhone,
        input.chatId,
        input.action.kind,
        payloadJson,
        now,
        now,
      )

    return {
      id: input.id,
      wamid: input.wamid,
      phone_number_id: input.phoneNumberId,
      waha_session: input.wahaSession,
      recipient_phone: input.recipientPhone,
      chat_id: input.chatId,
      action_type: input.action.kind,
      payload_json: payloadJson,
      status: 'queued',
      waha_message_id: null,
      attempts: 0,
      error_message: null,
      created_at: now,
      updated_at: now,
    }
  }

  listSessionsWithQueuedJobs(): string[] {
    const rows = this.db
      .prepare(`SELECT DISTINCT waha_session FROM outbound_jobs WHERE status = 'queued'`)
      .all() as Array<{ waha_session: string }>
    return rows.map((r) => r.waha_session)
  }

  claimNextQueuedJob(wahaSession: string): OutboundJobRow | null {
    const row = this.db
      .prepare(
        `SELECT * FROM outbound_jobs
         WHERE waha_session = ? AND status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get(wahaSession) as OutboundJobRow | undefined

    if (!row) return null

    const now = Date.now()
    const res = this.db
      .prepare(
        `UPDATE outbound_jobs
         SET status = 'processing', attempts = attempts + 1, updated_at = ?
         WHERE id = ? AND status = 'queued'`,
      )
      .run(now, row.id)

    if (Number(res.changes ?? 0) === 0) return null

    return {
      ...row,
      status: 'processing',
      attempts: row.attempts + 1,
      updated_at: now,
    }
  }

  markJobCompleted(id: string, wahaMessageId: string): void {
    this.db
      .prepare(
        `UPDATE outbound_jobs
         SET status = 'completed', waha_message_id = ?, error_message = NULL, updated_at = ?
         WHERE id = ?`,
      )
      .run(wahaMessageId, Date.now(), id)
  }

  requeueJobForRetry(id: string, errorMessage: string): void {
    this.db
      .prepare(
        `UPDATE outbound_jobs
         SET status = 'queued', error_message = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(errorMessage, Date.now(), id)
  }

  markJobFailed(id: string, errorMessage: string): void {
    this.db
      .prepare(
        `UPDATE outbound_jobs
         SET status = 'failed', error_message = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(errorMessage, Date.now(), id)
  }

  upsertMessageMapping(input: {
    wamid: string
    wahaMessageId: string
    phoneNumberId: string
    wahaSession: string
    recipientPhone: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO message_mappings (
          wamid, waha_message_id, phone_number_id, waha_session, recipient_phone, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(wamid) DO UPDATE SET
          waha_message_id = excluded.waha_message_id,
          phone_number_id = excluded.phone_number_id,
          waha_session = excluded.waha_session,
          recipient_phone = excluded.recipient_phone`,
      )
      .run(
        input.wamid,
        input.wahaMessageId,
        input.phoneNumberId,
        input.wahaSession,
        input.recipientPhone,
        Date.now(),
      )
  }

  findMappingByWahaMessageId(wahaMessageId: string): MessageMappingRow | null {
    const row = this.db
      .prepare(`SELECT * FROM message_mappings WHERE waha_message_id = ? LIMIT 1`)
      .get(wahaMessageId) as MessageMappingRow | undefined
    return row ?? null
  }

  findMappingByWamid(wamid: string): MessageMappingRow | null {
    const row = this.db
      .prepare(`SELECT * FROM message_mappings WHERE wamid = ? LIMIT 1`)
      .get(wamid) as MessageMappingRow | undefined
    return row ?? null
  }

  recordEvent(input: RecordEventInput): void {
    try {
      const id = crypto.randomUUID()
      const timestamp = Date.now()
      const detailsJson = input.details ? JSON.stringify(input.details) : null
      this.db
        .prepare(
          `INSERT INTO proxy_events (
            id, timestamp, level, category, waha_session, wamid, job_id, event_type, message, details_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          timestamp,
          input.level,
          input.category,
          input.wahaSession ?? null,
          input.wamid ?? null,
          input.jobId ?? null,
          input.eventType,
          input.message,
          detailsJson,
        )
    } catch {
      // Audit persistence must never crash message processing
    }
  }

  getQueueStats(): QueueStats {
    const grouped = this.db
      .prepare(
        `SELECT waha_session, status, COUNT(*) AS cnt
         FROM outbound_jobs
         GROUP BY waha_session, status`,
      )
      .all() as Array<{ waha_session: string; status: string; cnt: number }>

    const totals = emptyCounts()
    const bySession: Record<string, QueueStatusCounts> = {}

    for (const row of grouped) {
      const count = Number(row.cnt || 0)
      if (!bySession[row.waha_session]) {
        bySession[row.waha_session] = emptyCounts()
      }

      const sessionCounts = bySession[row.waha_session]
      if (
        row.status === 'queued' ||
        row.status === 'processing' ||
        row.status === 'completed' ||
        row.status === 'failed'
      ) {
        sessionCounts[row.status] += count
        totals[row.status] += count
      }
      sessionCounts.total += count
      totals.total += count
    }

    const mappingRow = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM message_mappings`)
      .get() as { cnt?: number } | undefined
    const eventsRow = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM proxy_events`)
      .get() as { cnt?: number } | undefined

    return {
      totals,
      bySession,
      mappingsCount: Number(mappingRow?.cnt ?? 0),
      eventsCount: Number(eventsRow?.cnt ?? 0),
    }
  }

  listJobs(filters: { status?: string; wahaSession?: string; limit?: number } = {}): OutboundJobRow[] {
    const clauses: string[] = []
    const params: Array<string | number> = []

    if (filters.status) {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    if (filters.wahaSession) {
      clauses.push('waha_session = ?')
      params.push(filters.wahaSession)
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const limit = clampLimit(filters.limit, 50)
    params.push(limit)

    return this.db
      .prepare(
        `SELECT * FROM outbound_jobs ${whereSql} ORDER BY created_at DESC LIMIT ?`,
      )
      .all(...params) as OutboundJobRow[]
  }

  listEvents(filters: { wamid?: string; wahaSession?: string; limit?: number } = {}): ProxyEventRecord[] {
    const clauses: string[] = []
    const params: Array<string | number> = []

    if (filters.wamid) {
      clauses.push('wamid = ?')
      params.push(filters.wamid)
    }
    if (filters.wahaSession) {
      clauses.push('waha_session = ?')
      params.push(filters.wahaSession)
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const limit = clampLimit(filters.limit, 50)
    params.push(limit)

    const rows = this.db
      .prepare(
        `SELECT * FROM proxy_events ${whereSql} ORDER BY timestamp DESC LIMIT ?`,
      )
      .all(...params) as ProxyEventRow[]

    return rows.map((row) => {
      let details: Record<string, unknown> | null = null
      if (row.details_json) {
        try {
          details = JSON.parse(row.details_json) as Record<string, unknown>
        } catch {
          details = null
        }
      }
      return {
        id: row.id,
        timestamp: row.timestamp,
        isoTimestamp: new Date(row.timestamp).toISOString(),
        level: row.level,
        category: row.category,
        wahaSession: row.waha_session,
        wamid: row.wamid,
        jobId: row.job_id,
        eventType: row.event_type,
        message: row.message,
        details,
      }
    })
  }

  close(): void {
    this.db.close()
  }
}
