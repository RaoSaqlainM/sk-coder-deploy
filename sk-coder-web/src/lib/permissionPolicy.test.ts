import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPermissionDecision, classifyPermissionRequest, clearPermissionGrants, savePermissionGrant, shouldPromptForPermission } from './permissionPolicy.ts'

test('classifies write, execute, and read requests', () => {
  assert.equal(classifyPermissionRequest('Please edit this file now'), 'write')
  assert.equal(classifyPermissionRequest('Run the build and deploy it'), 'execute')
  assert.equal(classifyPermissionRequest('Explain this function clearly'), 'read')
})

test('allow-once does not persist future permissions while allow-scope does', () => {
  clearPermissionGrants()

  const onceGrants = applyPermissionDecision('write', '/src/app.ts', 'allow-once')
  assert.equal(onceGrants.length, 0)
  assert.equal(shouldPromptForPermission('write', '/src/app.ts', true, onceGrants), true)

  const scopedGrants = applyPermissionDecision('write', '/src/app.ts', 'allow-scope')
  assert.equal(scopedGrants.length, 1)
  assert.equal(shouldPromptForPermission('write', '/src/app.ts', true, scopedGrants), false)

  clearPermissionGrants()
})

test('savePermissionGrant persists a scope-based decision', () => {
  clearPermissionGrants()
  const grants = savePermissionGrant('execute', '/src/cli.ts')
  assert.equal(grants.length, 1)
  assert.equal(shouldPromptForPermission('execute', '/src/cli.ts', true, grants), false)
  clearPermissionGrants()
})
