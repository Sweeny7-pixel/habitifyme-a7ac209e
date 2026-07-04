# Diagnosis: Home page "blank screen"

## What's actually happening

The dev server is healthy. `GET http://localhost:8080/` returns **200** with a complete SSR HTML shell (10.9 KB). No SSR exception, no route crash, no missing module.

The console error you're seeing is a **React hydration mismatch warning**, not a runtime crash:

```
data-tsd-source="/src/routes/__root.tsx:129:10"   (client)
data-tsd-source="/src/routes/__root.tsx:114:5"    (server)
```

Both point at the same `<html>` element in `src/routes/__root.tsx` — only the source-map line differs. That means SSR rendered the **previous version** of `__root.tsx` (line 114) while the browser hot-loaded the **new version** (line 129). This happens after any edit that invalidates the SSR module graph (Phase 3/16/20 touched `routeTree.gen.ts` and `__root.tsx`'s import chain).

React logs a big scary warning, aborts hydration for that subtree, then re-renders on the client. Net effect during the warning window: a brief blank/flash before the client tree mounts — which matches the `vite-error-overlay` blip in the session replay, followed by normal interactions.

## Why it's not a real bug

- Local SSR: 200 OK, full HTML.
- Published site (`habitifyme.lovable.app`): 200 OK (verified last turn).
- The `postMessage` warning is the Lovable preview bridge, unrelated.
- Session replay shows the user interacting with the page after the flash — the app did mount.

**Fix on your side:** hard-refresh the preview (Cmd/Ctrl+Shift+R). The mismatch clears once server and client are on the same build.

## Optional guardrail (only if you want it)

If the HMR hydration flash is annoying during development, we can silence the source-map attribute drift by not emitting `data-tsd-source` on the root `<html>`/`<head>`/`<body>` — but that's a devtool tradeoff, not a bug fix. Recommend **no code change**; just refresh.

## What I will NOT do

- No edits to `__root.tsx`, router, or SSR wrapper.
- No new error boundaries — the existing `errorComponent` is correct.
- No rollback of Phase 3/16/20 work.

## Next step

Approve this plan to close the issue as "stale HMR, refresh to resolve", or tell me to add the source-map suppression guardrail and I'll wire it in.
