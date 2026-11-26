// Fixture slop for the carried-forward behavior regression suite
// (docs/regression/SPEC.md). Registered, bundled, and animated like any
// other slop — the runner drives its http trigger (the secret per-slop key)
// through the API.
export const meta = {
  title: 'Slopfix Http Key',
  author: 'slopfix',
  prompt: 'regression fixture - http trigger key',
  createdAt: '2026-01-01T00:00:00Z',
  // A creator (agent) proposal of the http type — the suite pins that this
  // is rejected outright (not held): the secret key is server/streamer-only
  // and generated code can never mint itself a bearer URL.
  triggers: [{ "type": "http" }],
};


export function init(ctx) {
  
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  c.fillStyle = ctx.accent;
  c.beginPath();
  c.rect(ctx.width / 2 - 24, ctx.height / 2 - 24, 48 + 10 * Math.sin(t * 2), 48 + 10 * Math.cos(t * 2));
  c.fill();
}
