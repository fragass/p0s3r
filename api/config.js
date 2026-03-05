export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const url = process.env.SUPABASE_URL;
  const hasRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // não vamos expor keys; só um sanity check pro front mostrar msg melhor se quiser
  return res.status(200).json({
    ok: !!url && hasRole
  });
}
