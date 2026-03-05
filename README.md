# w0rkd4y HTML + /api + Supabase (Vercel)

## 1) Supabase
- Rode `supabase/schema.sql` no SQL Editor
- Crie um bucket no Storage chamado `uploads` (ou defina `SUPABASE_UPLOAD_BUCKET`)

## 2) Vercel env
No Vercel > Project Settings > Environment Variables:
- SUPABASE_URL
- SUPABASE_ANON_KEY (não usado no backend, mas mantenho por compat)
- SUPABASE_SERVICE_ROLE_KEY
- SESSION_TTL_HOURS (opcional)
- DM_TTL_MINUTES (opcional)

## 3) Rodar local
```
npm i
npx vercel dev
```
ou sirva estático + funções conforme seu setup.
