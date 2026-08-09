// Vercel's Node.js runtime augments these with `req.query`/`req.body` and
// `res.status()`/`res.json()` at runtime -- typed locally instead of via
// @vercel/node, which drags in a vulnerable, Python-build-analysis-heavy
// dependency tree for a handful of fields this project never uses elsewhere.
interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, service: 'voidtune-website' });
}
