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
// the sandbox's self-heal exists for) — so only a narrowing AFTER a stable
// wide boot counts as a resize. "Stable" is debounced: the wide state must
// have held for ~750ms before a narrowing is treated as a real resize —
// otherwise the boot-race reflow (a transient narrow measurement right
// after the CSS applies, seen on slow CI runners) ends the play before the
// test's control check. The pinned behavior is unchanged: a REAL resize
// re-runs init and the slop's own init logic ends the play.
let seenWideAt = 0;

export function init(ctx) {
  if (ctx.width >= 1000) {
    if (!seenWideAt) seenWideAt = Date.now();
  } else if (seenWideAt && Date.now() - seenWideAt > 750) {
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
