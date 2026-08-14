import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

/**
 * Per dsh-forge-verify: a hand-built `ctx.plugin({ name, inject, apply })`
 * call in a test supplies `inject` manually and therefore cannot catch a
 * stray default export — that mistake shipped in DSH's own ACP server
 * despite full unit coverage, because none of its tests exercised the
 * module's actual export shape. This test asserts that shape directly.
 */
describe('module export shape (function form)', () => {
  it('has no default export', () => {
    expect('default' in plugin).toBe(false)
  })

  it('exports the Loader-facing named contract', () => {
    expect(plugin.name).toBe('dsh-plugin-template')
    expect(plugin.inject).toEqual([])
    expect(plugin.Config).toBeDefined()
    expect(typeof plugin.apply).toBe('function')
  })
})
