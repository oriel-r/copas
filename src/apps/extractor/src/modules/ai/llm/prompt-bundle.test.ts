import { describe, it, expect } from 'vitest'
import { DEFAULT_SYSTEM_PROMPT } from './system-prompt.js'
import extractionMd from '../../../../prompts/extraction.md'

describe('prompt SSOT bundle', () => {
  it('DEFAULT_SYSTEM_PROMPT equals prompts/extraction.md content and is in English', async () => {
    expect(DEFAULT_SYSTEM_PROMPT.trim()).toBe(extractionMd.trim())
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Insurance Policy Extractor')
    expect(DEFAULT_SYSTEM_PROMPT).not.toContain('Eres un extractor experto')
    expect(DEFAULT_SYSTEM_PROMPT).toContain('UPPERCASE and WITHOUT ACCENTS')
  })
})
