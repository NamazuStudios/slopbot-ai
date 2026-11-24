// Fixture slop for the carried-forward behavior regression suite
// (docs/regression/SPEC.md). Registered, bundled, and animated like any
// other slop — the runner drives its triggers through the API.
export const meta = {
  title: 'Slopfix Done On Resize',
  author: 'slopfix',
  prompt: 'regression fixture - canvas resize re-runs init',
  createdAt: '2026-01-01T00:00:00Z',
};

// A fresh iframe can boot before the parent's CSS sizes it (the boot race
// the sandbox's self-heal exists for) — so only a narrowing AFTER a long
// stable wide boot counts as a resize. The 20s debounce makes the end
// condition deterministic: layout settling (even on slow CI runners) and
// the boot-race reflow can never end the play; only a REAL resize after
// the test's settle window does. (The sandbox has no timers, so the
// debounce is measured between init runs via Date.now().)
let seenWideAt = 0;

export function init(ctx) {
  if (ctx.width >= 1000) {
    if (!seenWideAt) seenWideAt = Date.now();
  } else if (seenWideAt && Date.now() - seenWideAt > 20_000) {
    ctx.done();
  }
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  c.fillStyle = ctx.accent;
  c.beginPath();
  c.arc(ctx.width / 2, ctx.height / 2, 24 + 8 * Math.sin(t * 3), 0, Math.PI * 2);
  c.fill();
}
