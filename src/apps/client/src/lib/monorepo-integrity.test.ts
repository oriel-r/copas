import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CreatePolicyRequest, CreateUserFormValues, Policy } from '@copas/contracts'

describe('Monorepo Integrity and Typing Contracts', () => {
  describe('@copas/contracts exports', () => {
    it('exports CreatePolicyRequest, Policy, and CreateUserFormValues types', () => {
      // Type-level static assertion
      type AssertDefined<T> = [T] extends [never] ? false : true
      const hasCreatePolicyRequest: AssertDefined<CreatePolicyRequest> = true
      const hasPolicy: AssertDefined<Policy> = true
      const hasCreateUserFormValues: AssertDefined<CreateUserFormValues> = true

      expect(hasCreatePolicyRequest).toBe(true)
      expect(hasPolicy).toBe(true)
      expect(hasCreateUserFormValues).toBe(true)
    })
  })

  describe('Client Package Dependencies', () => {
    it('includes @copas/contracts in client dependencies', () => {
      const clientPackageJsonPath = path.resolve(__dirname, '../../package.json')
      const clientPackageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf-8'))

      const hasContractsDep = Boolean(
        clientPackageJson.dependencies?.['@copas/contracts'] ||
        clientPackageJson.devDependencies?.['@copas/contracts'],
      )

      expect(hasContractsDep).toBe(true)
    })
  })

  describe('Root Configuration and Cloudflare Workers Types', () => {
    it('specifies @cloudflare/workers-types version 5.20260804.1 in root package.json or pnpm overrides', () => {
      const rootPackageJsonPath = path.resolve(__dirname, '../../../../../package.json')
      const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'))

      const workersTypesVersion =
        rootPackageJson.pnpm?.overrides?.['@cloudflare/workers-types'] ??
        rootPackageJson.devDependencies?.['@cloudflare/workers-types'] ??
        rootPackageJson.dependencies?.['@cloudflare/workers-types'] ??
        rootPackageJson.overrides?.['@cloudflare/workers-types']

      expect(workersTypesVersion).toBe('5.20260804.1')
    })
  })
})
