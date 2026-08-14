import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'
import type { Config } from '../src/index.ts'

describe('plugin activation and disposal', () => {
  it('mounts through a real Context and disposes cleanly', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = new Context()

    // Awaiting ctx.plugin(...) settles once loading has finished — Cordis
    // has no separate ctx.start() step.
    const fiber = await ctx.plugin(plugin, { greeting: 'Hi there' })

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Hi there'))

    // Disposal must actually remove what this plugin registered — resolving
    // without throwing is not itself evidence of cleanup (dsh-forge-verify's
    // rule). Assert the disposer's own effect actually ran, not just that
    // dispose() settled.
    await fiber.dispose()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('unloaded'))

    logSpy.mockRestore()
  })

  it('applies the schema default when no config is given', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = new Context()

    // The Config type here describes the *resolved* config (post-schema).
    // Casting past it is deliberate: this test exercises schemastery filling
    // in the default for a field the caller omitted, which the static type
    // of a resolved Config would otherwise disallow at the call site.
    const fiber = await ctx.plugin(plugin, {} as Config)

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Hello'))

    await fiber.dispose()
    logSpy.mockRestore()
  })
})
