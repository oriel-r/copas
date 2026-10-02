#!/usr/bin/env node

/**
 * Validates markdown documents across the project according to meta/ standards:
 * - Checks presence and validity of YAML frontmatter
 * - Validates document type, status, producer, and dates
 * - Enforces required fields for deprecated/superseded states
 * - Audits document expiration (expires field)
 * - Checks cross-referencing links starting with /
 */

import fs from 'node:fs'
import path from 'node:path'

const VALID_TYPES = new Set([
  'concept',
  'decision',
  'convention',
  'raw_data',
  'media_script',
  'media-script',
  'meta',
  'roadmap',
  'rules',
  'guide',
])

const VALID_STATUSES = new Set(['draft', 'active', 'deprecated', 'superseded', 'archived'])

const TARGET_DIRS = ['docs', 'src/docs', 'scripts', 'meta']

function findMarkdownFiles(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) return fileList
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, fileList)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content }
  }
  const secondDashIndex = content.indexOf('\n---', 3)
  if (secondDashIndex === -1) {
    return { frontmatter: null, body: content }
  }

  const rawFm = content.slice(3, secondDashIndex).trim()
  const body = content.slice(secondDashIndex + 4).trim()
  const frontmatter = {}

  for (const line of rawFm.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }

  return { frontmatter, body }
}

function stripCodeBlocks(text) {
  // Strip fenced code blocks
  let stripped = text.replace(/```[\s\S]*?```/g, '')
  // Strip inline code spans
  stripped = stripped.replace(/`[^`\n]+`/g, '')
  return stripped
}

function validateFile(filePath, repoRoot, options = {}) {
  const relPath = path.relative(repoRoot, filePath)
  const basename = path.basename(filePath)
  const isIndexOrLog = basename === 'index.md' || basename === 'log.md'
  const content = fs.readFileSync(filePath, 'utf8')
  const errors = []
  const warnings = []

  const { frontmatter, body } = parseFrontmatter(content)

  if (!frontmatter) {
    if (isIndexOrLog && !options.strict) {
      warnings.push(`Index/log file without YAML frontmatter (navigation entrypoint)`)
    } else {
      errors.push(`Missing or malformed frontmatter (must start with '---')`)
    }
    return { relPath, errors, warnings }
  }

  // Validate type
  if (!frontmatter.type) {
    errors.push(`Missing field 'type'`)
  } else if (!VALID_TYPES.has(frontmatter.type)) {
    errors.push(`Invalid type '${frontmatter.type}'. Allowed: ${Array.from(VALID_TYPES).join(', ')}`)
  }

  // Validate producer
  if (!frontmatter.producer || frontmatter.producer.trim() === '') {
    warnings.push(`Missing or empty 'producer'`)
  }

  // Validate status
  if (!frontmatter.status) {
    errors.push(`Missing field 'status'`)
  } else if (!VALID_STATUSES.has(frontmatter.status)) {
    errors.push(`Invalid status '${frontmatter.status}'. Allowed: ${Array.from(VALID_STATUSES).join(', ')}`)
  }

  // Validate created date
  if (!frontmatter.created || isNaN(Date.parse(frontmatter.created))) {
    errors.push(`Invalid or missing 'created' date: '${frontmatter.created ?? ''}'`)
  }

  // Validate terminal states
  if (frontmatter.status === 'deprecated') {
    if (!frontmatter.deprecatedReason || frontmatter.deprecatedReason.trim() === '') {
      errors.push(`Status 'deprecated' requires a non-empty 'deprecatedReason'`)
    }
  }

  if (frontmatter.status === 'superseded') {
    if (!frontmatter.deprecatedReason || frontmatter.deprecatedReason.trim() === '') {
      errors.push(`Status 'superseded' requires a non-empty 'deprecatedReason'`)
    }
    if (!frontmatter.supersededBy || frontmatter.supersededBy.trim() === '') {
      errors.push(`Status 'superseded' requires a non-empty 'supersededBy' path`)
    }
  }

  // Validate expiration
  if (frontmatter.expires && frontmatter.expires.trim() !== '') {
    const expireTime = Date.parse(frontmatter.expires)
    if (isNaN(expireTime)) {
      warnings.push(`Unparseable 'expires' date: '${frontmatter.expires}'`)
    } else if (expireTime < Date.now()) {
      warnings.push(`Document expired on ${frontmatter.expires}`)
    }
  }

  // Validate absolute internal links: [text](/path/to/file.md) outside code blocks
  const searchableBody = stripCodeBlocks(body)
  const linkRegex = /\[([^\]]+)\]\(((\/(docs|src\/docs|meta|scripts)[^)]+))\)/g
  let match
  while ((match = linkRegex.exec(searchableBody)) !== null) {
    const targetLink = match[2].split('#')[0] // remove hash
    const targetPath = path.join(repoRoot, targetLink.startsWith('/') ? targetLink.slice(1) : targetLink)
    if (!fs.existsSync(targetPath)) {
      warnings.push(`Broken link '${targetLink}' (file not found at target)`)
    }
  }

  return { relPath, errors, warnings }
}

function run() {
  const repoRoot = process.cwd()
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const customTarget = args.find(a => !a.startsWith('--'))

  let filesToScan = []
  if (customTarget) {
    const targetAbs = path.resolve(repoRoot, customTarget)
    if (fs.statSync(targetAbs).isDirectory()) {
      filesToScan = findMarkdownFiles(targetAbs)
    } else {
      filesToScan = [targetAbs]
    }
  } else {
    for (const dir of TARGET_DIRS) {
      const absDir = path.join(repoRoot, dir)
      findMarkdownFiles(absDir, filesToScan)
    }
  }

  console.log(`\n🔍 Validating ${filesToScan.length} documentation file(s) against meta/ specifications...\n`)

  let totalErrors = 0
  let totalWarnings = 0
  let invalidFiles = 0

  for (const file of filesToScan) {
    const { relPath, errors, warnings } = validateFile(file, repoRoot, { strict })
    if (errors.length > 0 || warnings.length > 0) {
      if (errors.length > 0) invalidFiles++
      console.log(`📄 ${relPath}`)
      for (const err of errors) {
        totalErrors++
        console.log(`   ❌ ERROR: ${err}`)
      }
      for (const warn of warnings) {
        totalWarnings++
        console.log(`   ⚠️  WARN:  ${warn}`)
      }
      console.log('')
    }
  }

  console.log('--------------------------------------------------')
  console.log(`Result: ${filesToScan.length - invalidFiles}/${filesToScan.length} valid content files.`)
  console.log(`Errors: ${totalErrors} | Warnings: ${totalWarnings}`)
  console.log('--------------------------------------------------\n')

  if (totalErrors > 0) {
    process.exit(1)
  }
}

run()
