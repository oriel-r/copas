#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

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

  // Allowed documentation, configuration, and contracts paths
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

function detectAgent(payload) {
  if (!payload) return 'unknown';

  if (payload.transcriptPath && fs.existsSync(payload.transcriptPath)) {
    try {
      const fd = fs.openSync(payload.transcriptPath, 'r');
      const buffer = Buffer.alloc(32768);
      const bytesRead = fs.readSync(fd, buffer, 0, 32768, 0);
      fs.closeSync(fd);
      const header = buffer.toString('utf8', 0, bytesRead);

      if (/senior-implementer|Senior Implementer|Senior TypeScript Developer \/ Implementer/i.test(header)) {
        return 'senior-implementer';
      }
      if (/senior-qa-engineer|Senior QA Engineer|Senior Quality Assurance Engineer/i.test(header)) {
        return 'senior-qa-engineer';
      }
      if (/senior-architect|Senior Software Architect/i.test(header)) {
        return 'senior-architect';
      }
    } catch (e) {
      // Fallback
    }
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

    if (agent === 'senior-implementer') {
      // Rule 1: No reading test files
      if (toolName === 'view_file') {
        const filePath = args.AbsolutePath || '';
        if (isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-implementer is strictly prohibited from viewing or inspecting *.test.ts files.'
          }));
          return;
        }
      }

      // Rule 2: No modifying / creating test files
      if (toolName === 'write_to_file' || toolName === 'replace_file_content') {
        const filePath = args.TargetFile || '';
        if (isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-implementer is strictly prohibited from creating, modifying, or deleting *.test.ts files.'
          }));
          return;
        }
      }

      // Rule 3: No searching test files
      if (toolName === 'grep_search') {
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
      // Rule 1: No writing to non-test files
      if (toolName === 'write_to_file' || toolName === 'replace_file_content') {
        const filePath = args.TargetFile || '';
        if (!isTestFile(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-qa-engineer is strictly prohibited from creating or modifying files outside of *.test.ts.'
          }));
          return;
        }
      }

      // Rule 2: Black-Box reading - only tests, contracts, docs, configs
      if (toolName === 'view_file') {
        const filePath = args.AbsolutePath || '';
        if (!isAllowedQAReadPath(filePath)) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'Hard boundary enforced: senior-qa-engineer operates under black-box testing and is strictly prohibited from inspecting internal application source code.'
          }));
          return;
        }
      }

      // Rule 3: Grep searching internal app code without filtering to tests
      if (toolName === 'grep_search') {
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
