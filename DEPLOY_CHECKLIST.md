# Bu Gece Yayın Checklist

## 1. Supabase (5 dk)

1. [supabase.com](https://supabase.com) → New project
2. **SQL Editor** → New query → `supabase/migrations/001_initial.sql` içeriğini yapıştır → Run
3. **SQL Editor** → New query → `supabase/migrations/002_admin_policies.sql` içeriğini yapıştır → Run
4. **Authentication** → **Providers** → **Google** → Enable, Client ID + Secret (Google Cloud Console’dan)
5. **Project Settings** → **API** → `URL` ve `anon key` kopyala; **service_role** key’i kopyala (gizli tut)

## 2. Replicate (2 dk)

1. [replicate.com](https://replicate.com) → Account → API tokens → Create token
2. Token’ı kopyala

## 3. Vercel (5 dk)

1. [vercel.com](https://vercel.com) → Add New → Project → Repo’yu bağla (veya `vercel` CLI ile)
2. **Environment Variables** ekle:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `REPLICATE_API_TOKEN` | Replicate token |

3. **Build**: Framework preset **Vite**, Output Directory **dist** (varsayılan)
4. Deploy

## 4. Supabase redirect (1 dk)

- **Authentication** → **URL Configuration**
- **Site URL**: `https://dreemart.app`
- **Redirect URLs**: `https://dreemart.app/**`

## 5. İlk admin (1 dk)

Supabase **SQL Editor**:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'SENIN_GOOGLE_EMAIL@gmail.com';
```

(Önce bir kez Google ile giriş yap; sonra bu SQL’i çalıştır.)

## 6. (Opsiyonel) Paddle

- Ürün/fiyat oluştur → Webhook URL: `https://dreemart.app/api/paddle-webhook`
- Env: `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`, `VITE_PADDLE_CHECKOUT_URL`

---

**Test:**  
- `https://dreemart.app` → Google ile giriş → Rüya yaz → Ressam seç → Görselleştir  
- `https://dreemart.app/admin` → Admin girişi (sadece role=admin olan kullanıcı)
