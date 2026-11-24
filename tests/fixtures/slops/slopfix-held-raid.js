// Fixture slop for the carried-forward behavior regression suite
// (docs/regression/SPEC.md). Registered, bundled, and animated like any
// other slop — the runner drives its triggers through the API.
export const meta = {
  title: 'Slopfix Held Raid',
  author: 'slopfix',
  prompt: 'regression fixture - creator proposal held by the allow-list',
  createdAt: '2026-01-01T00:00:00Z',
  triggers: [{ "type": "raid", "minViewers": 1 }],
};


export function init(ctx) {
  
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  c.fillStyle = ctx.accent;
  c.beginPath();
  c.arc(ctx.width / 2, ctx.height / 2, 24 + 8 * Math.sin(t * 3), 0, Math.PI * 2);
  c.fill();
}
