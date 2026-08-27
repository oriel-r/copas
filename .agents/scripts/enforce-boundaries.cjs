#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CACHE_DIR = path.join(os.tmpdir(), 'agy-boundary-cache');
const TAIL_BYTES = 65536;
const HEADER_BYTES = 32768;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', err => {
      reject(err);
    });
  });
}

function normalizePath(p) {
  if (!p) return '';
  let clean = p.replace(/^file:\/\//, '');
  return clean.replace(/\\/g, '/');
}

function isTestFile(filePath) {
  const norm = normalizePath(filePath).toLowerCase();
  return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(norm);
}

function isAllowedQAReadPath(filePath) {
  const norm = normalizePath(filePath);
  if (isTestFile(norm)) return true;

  const allowedPatterns = [
    /\/docs\//i,
    /\/meta\//i,
    /\/src\/docs\//i,
    /\/src\/packages\/contracts\//i,
    /\/packages\/contracts\//i,
    /package\.json$/i,
    /tsconfig.*\.json$/i,
    /turbo\.json$/i,
    /vitest\.config\.(ts|js|mjs|cjs)$/i,
    /stryker\.conf\.(json|js)$/i,
    /CONVENTIONS\.md$/i,
    /AGENTS\.md$/i,
    /README\.md$/i,
  ];

  return allowedPatterns.some(pattern => pattern.test(norm));
}

function agentFromText(text) {
  if (!text) return null;
  if (/senior-implementer|Senior Implementer|Senior TypeScript Developer \/ Implementer/i.test(text)) {
    return 'senior-implementer';
  }
  if (/senior-qa-engineer|Senior QA Engineer|Senior Quality Assurance Engineer/i.test(text)) {
    return 'senior-qa-engineer';
  }
  if (/senior-architect|Senior Software Architect/i.test(text)) {
    return 'senior-architect';
  }
  return null;
}

function ensureCacheDir() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

function getCachePath(conversationId) {
  if (!conversationId) return null;
  const safe = String(conversationId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readCachedAgent(payload) {
  const conversationId = payload.conversationId;
  const transcriptPath = payload.transcriptPath;
  if (!conversationId || !transcriptPath) return null;
  const cachePath = getCachePath(conversationId);
  if (!cachePath || !fs.existsSync(cachePath)) return null;
  try {
    const stat = fs.statSync(transcriptPath);
    const raw = fs.readFileSync(cachePath, 'utf8');
    const cached = JSON.parse(raw);
    if (cached.mtimeMs === stat.mtimeMs && cached.size === stat.size && cached.agent) {
      return cached.agent;
    }
  } catch {}
  return null;
}

function writeCachedAgent(payload, agent) {
  const conversationId = payload.conversationId;
  const transcriptPath = payload.transcriptPath;
  if (!conversationId || !transcriptPath || !agent || agent === 'unknown') return;
  const cachePath = getCachePath(conversationId);
  if (!cachePath) return;
  try {
    ensureCacheDir();
    const stat = fs.statSync(transcriptPath);
    const data = JSON.stringify({ agent, mtimeMs: stat.mtimeMs, size: stat.size });
    fs.writeFileSync(cachePath, data, 'utf8');
  } catch {}
}

function detectAgent(payload) {
  if (!payload) return 'unknown';

  const cached = readCachedAgent(payload);
  if (cached) return cached;

  const transcriptPath = payload.transcriptPath;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return 'unknown';
  }

  try {
    const stat = fs.statSync(transcriptPath);
    const fileSize = stat.size;
    if (fileSize === 0) return 'unknown';

    // 1. Tail 64k — most relevant in GUI (invoke_subagent appears at end)
    if (fileSize > 0) {
      const tailSize = Math.min(TAIL_BYTES, fileSize);
      const offset = Math.max(0, fileSize - tailSize);
      const fd = fs.openSync(transcriptPath, 'r');
      try {
        const buffer = Buffer.alloc(tailSize);
        const bytesRead = fs.readSync(fd, buffer, 0, tailSize, offset);
        const tail = buffer.toString('utf8', 0, bytesRead);
        const agent = agentFromText(tail);
        if (agent) {
          fs.closeSync(fd);
          writeCachedAgent(payload, agent);
          return agent;
        }
      } finally {
        try { fs.closeSync(fd); } catch {}
      }
    }

    // 2. Header 32k — covers mainAgent selected via /agent (prompt at start)
    // Only if tail missed, to keep SSD writes minimal
    if (fileSize > TAIL_BYTES || true) {
      const headerSize = Math.min(HEADER_BYTES, fileSize);
      // If file is smaller than tail, we already scanned it; skip duplicate read
      if (fileSize > TAIL_BYTES || fileSize <= TAIL_BYTES) {
        // For small files (<64k) tail already covered full file, but keep logic explicit
        if (fileSize <= TAIL_BYTES) {
          // Already scanned full file via tail, no need for header
          return 'unknown';
        }
      }
      const fd2 = fs.openSync(transcriptPath, 'r');
      try {
        const buffer2 = Buffer.alloc(headerSize);
        const bytesRead2 = fs.readSync(fd2, buffer2, 0, headerSize, 0);
        const header = buffer2.toString('utf8', 0, bytesRead2);
        const agent2 = agentFromText(header);
        if (agent2) {
          writeCachedAgent(payload, agent2);
          return agent2;
        }
      } finally {
        try { fs.closeSync(fd2); } catch {}
      }
    }
  } catch (e) {
    // Fallback to unknown
  }

  return 'unknown';
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      console.log(JSON.stringify({ decision: 'allow' }));
      return;
    }

    const payload = JSON.parse(raw);
    const agent = detectAgent(payload);
    const toolName = payload.toolCall?.name || '';
    const args = payload.toolCall?.args || {};

    // Support both legacy and new tool names
    const isDenyViewTest = toolName === 'view_file';
    const isDenyWriteTest = toolName === 'write_to_file' || toolName === 'replace_file_content' || toolName === 'multi_replace_file_content';
    const isGrep = toolName === 'grep_search';

    if (agent === 'senior-implementer') {
      if (isDenyViewTest) {
        const filePath = args.AbsolutePath || '';
        if (isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-implementer is strictly prohibited from viewing or inspecting *.test.ts files.'
          }));
          return;
        }
      }

      if (isDenyWriteTest) {
        const filePath = args.TargetFile || '';
        if (isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-implementer is strictly prohibited from creating, modifying, or deleting *.test.ts files.'
          }));
          return;
        }
      }

      if (isGrep) {
        const searchPath = args.SearchPath || '';
        const includes = args.Includes || [];
        if (isTestFile(searchPath) || includes.some(inc => isTestFile(inc))) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-implementer is strictly prohibited from searching within *.test.ts files.'
          }));
          return;
        }
      }
    }

    if (agent === 'senior-qa-engineer') {
      if (isDenyWriteTest) {
        const filePath = args.TargetFile || '';
        if (!isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-qa-engineer is strictly prohibited from creating or modifying files outside of *.test.ts.'
          }));
          return;
        }
      }

      if (isDenyViewTest) {
        const filePath = args.AbsolutePath || '';
        if (!isAllowedQAReadPath(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-qa-engineer operates under black-box testing and is strictly prohibited from inspecting internal application source code.'
          }));
          return;
        }
      }

      if (isGrep) {
        const searchPath = args.SearchPath || '';
        const includes = args.Includes || [];
        const isTargetingAppCode = /src\/(apps|modules|services|controllers|repositories)/i.test(normalizePath(searchPath));
        const onlyTests = includes.length > 0 && includes.every(inc => isTestFile(inc));

        if (isTargetingAppCode && !onlyTests) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-qa-engineer cannot search internal application source code (Black-box testing).'
          }));
          return;
        }
      }
    }

    console.log(JSON.stringify({ decision: 'allow' }));
  } catch (err) {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
}

main();
