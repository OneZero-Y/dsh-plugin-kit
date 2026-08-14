# Optional: a browser (DSH Web GUI) half

Read "The client half (lower confidence — verify before shipping)" in `dsh-plugin-kit`'s `docs/plugin-contract-reference.md` before starting this. Short version: no official DSH tutorial walks a third-party author through building a Web client plugin from an outside repository. What's below is inferred from documentation written for contributing a *built-in* client package to the DSH repository itself — validate it against a real running `dsh web` for the version you target before relying on it.

This file is guidance, not a directory to copy — there is no `template/optional/` skeleton to drop in, because the exact current API surface (`ctx.slots`, prop shapes, `dsh.client` manifest fields) is more likely to have shifted between DSH versions than the host-half contract this kit's `template/` otherwise covers with confidence.

## What to check before writing any client code

1. **Does `dsh.client` still work the way described here?** Open a current `deepseek-ai/deepseek-harness` checkout and read `packages/client/AGENTS.md` directly — do not rely on a summary from an older kit or plugin. Confirm the manifest field name, whether a separate build step or bundler config is expected, and what the conventional export path (`./client` in prior versions) actually is now.
2. **Is `ctx.slots.register` still the sole composition API?** As of the version this kit's contract reference was written against, a client plugin contributes UI only by registering into a named slot with a `{ name, children?, store?, inject? }` descriptor — there was no other sanctioned route, and rendering an undeclared slot failed at load. Confirm this is still current before designing around it.
3. **Do components still avoid touching `ctx` directly?** The pattern described treats `ctx` as apply-time-only; components receive everything through props derived from four sources (owner-supplied render-site data, declared child-slot keys, a declared store, and the `inject` face). If this has changed, your implementation approach changes with it.

## If the mechanism still matches

Add a browser entry (conventionally `src/client/index.ts`, exported as `./client` from `package.json`), export a minimal plugin shape from it (`{ name, apply(ctx) }` mounting whatever slot registration the capability needs), and keep the same lifecycle discipline as the host half: every registration is a `ctx.slots.register(...)` call whose removal you can verify, not a side effect that runs once and hopes.

## Verification

There is no official tutorial-grade automated test pattern documented for a third-party client plugin at the time this kit was written. At minimum: manually load the plugin into a real `dsh web` instance and confirm the UI renders, updates, and cleanly disappears when the plugin is removed from the profile. Treat "it rendered once in my manual test" as the current ceiling of confidence, and say so in your own plugin's README rather than implying a level of automated coverage this kit could not itself establish.
