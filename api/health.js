export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    app: 'VeriCard',
    runtime: 'vercel',
    timestamp: new Date().toISOString()
  });
}
