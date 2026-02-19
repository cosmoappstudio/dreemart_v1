# Sadece senden istenenler

Kod ve dokümanlar **dreemart-v1.vercel.app** (Vercel) için güncellendi. Aşağıdakileri **yalnızca sen** yapabilirsin (Supabase / Vercel / Google / local bilgisayar erişimi gerekiyor).

---

## 1. Supabase’te SQL’i çalıştır

- **Supabase Dashboard** → [supabase.com/dashboard](https://supabase.com/dashboard) → projen
- **SQL Editor** → **New query**
- `supabase/run-all-migrations.sql` dosyasının **tüm içeriğini** kopyala → yapıştır → **Run**

---

## 2. Supabase: Service Role Key’i kopyala

- **Project Settings** → **API** → **service_role** (Reveal) → kopyala  
- Bunu hem local `.env` hem Vercel env’lere `SUPABASE_SERVICE_ROLE_KEY` olarak ekleyeceksin.

---

## 3. Google OAuth (Supabase için)

- **Supabase** → **Authentication** → **Providers** → **Google** → Enable
- [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth 2.0 Client ID oluştur
- **Authorized redirect URI:** `https://lmtwmnvnzizmkfotnymz.supabase.co/auth/v1/callback`
- Client ID + Secret’ı Supabase Google alanlarına yapıştır

---

## 4. Local .env dosyası

Proje kökünde `.env` oluştur; aşağıdaki değerleri doldur (anon key, Replicate token, service_role key’i sen ekleyeceksin):

```env
VITE_SUPABASE_URL=https://lmtwmnvnzizmkfotnymz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
REPLICATE_API_TOKEN=<Replicate token>
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
VITE_PADDLE_CHECKOUT_URL=
VITE_APP_URL=
```

---

## 5. İlk giriş + admin

- Local’de `npm run dev` → **Google ile Giriş** → `gokturk4business@gmail.com` ile giriş yap
- **Supabase SQL Editor**’da çalıştır:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'gokturk4business@gmail.com';
```

---

## 6. GitHub + Vercel

- Kodu GitHub’a push et
- **Vercel** → Add New Project → Repo’yu seç
- **Environment Variables** ekle: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REPLICATE_API_TOKEN`, (isteğe bağlı) `VITE_APP_URL=dreemart-v1.vercel.app`
- İsteğe bağlı: **Vercel** → **Settings** → **Domains** → `dreemart.app` ekle → DNS’te CNAME/A kaydını tanımla

---

## 7. Supabase’te production URL

- **Supabase** → **Authentication** → **URL Configuration**
- **Site URL:** `https://dreemart-v1.vercel.app`
- **Redirect URLs:** `https://dreemart-v1.vercel.app`, `https://dreemart-v1.vercel.app/**`, `https://dreemart-v1.vercel.app/app` (son satır yoksa giriş sonrası "requested path is invalid" hatası alırsın)

---

Bu yediyi yaptığında backend ve domain hazır olur. Detaylar için **SETUP.md**’e bak.
