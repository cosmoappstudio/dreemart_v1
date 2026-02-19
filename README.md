# DreamInk

Rüyalarınızı ünlü ressamların tarzında sanat eserine dönüştüren AI web uygulaması.

## Özellikler

- **Google ile giriş** (Supabase Auth)
- **Rüya görselleştirme** (Replicate Imagen-4)
- **Rüya yorumu** (Replicate Claude 3.5 Sonnet)
- **Kredi sistemi** (Paddle ile ödeme)
- **Admin paneli** (`/admin`) — kullanıcılar, ressamlar, promptlar

## Kurulum

**Backend (Supabase, Replicate, Paddle, Vercel) adım adım kurulum için → [SETUP.md](./SETUP.md)**

### 1. Bağımlılıklar

```bash
npm install
```

### 2. Ortam değişkenleri

`.env` veya `.env.local` oluştur (`.env.example` referans alın):

```env
# Supabase (supabase.com)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Replicate (replicate.com)
REPLICATE_API_TOKEN=r8_...

# Paddle (opsiyonel, ödeme için)
PADDLE_VENDOR_ID=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_ENV=sandbox
VITE_PADDLE_CHECKOUT_URL=

# Production URL (Vercel’de otomatik)
VITE_APP_URL=
```

### 3. Supabase

1. [Supabase](https://supabase.com) projesi oluştur.
2. **Authentication → Providers** içinde **Google**’ı aç; Client ID ve Secret ekle.
3. **SQL Editor**’de `supabase/migrations/001_initial.sql` ve `002_admin_policies.sql` dosyalarını sırayla çalıştır.
4. **Storage**’da `dream-images` bucket’ı oluştur (isterseniz).
5. İlk admin kullanıcıyı atamak için SQL:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'senin@email.com';
```

### 4. Replicate

1. [Replicate](https://replicate.com) hesabı aç.
2. **Account → API tokens**’dan token oluştur.
3. `REPLICATE_API_TOKEN` olarak ekle.

### 5. Paddle (opsiyonel)

1. [Paddle](https://paddle.com) hesabı; kredi paketi (ürün/fiyat) oluştur.
2. Webhook URL: `https://dreemart-v1.vercel.app/api/paddle-webhook`
3. Webhook secret’ı `PADDLE_WEBHOOK_SECRET` olarak ekle.
4. Checkout link’ini `VITE_PADDLE_CHECKOUT_URL` olarak ayarla (veya uygulama içinde dinamik oluştur).

## Çalıştırma

```bash
# Geliştirme
npm run dev

# Build
npm run build

# Önizleme
npm run preview
```

## Vercel’e deploy

1. Repo’yu Vercel’e bağla.
2. **Environment Variables**’a yukarıdaki tüm değişkenleri ekle (`VITE_*` ve `SUPABASE_*`, `REPLICATE_*`, `PADDLE_*`).
3. **Supabase → Authentication → URL Configuration**’da Site URL ve Redirect URLs’e `https://dreemart-v1.vercel.app` (ve varsa özel domain) ekle.
4. Deploy et.

## Proje yapısı

- `App.tsx` — Router, login, korumalı/admin route’lar
- `MainApp.tsx` — Ana uygulama (rüya girişi, galeri, profil)
- `admin/` — Admin paneli (dashboard, kullanıcılar, ressamlar, promptlar)
- `api/` — Vercel serverless: `generate-dream`, `paddle-webhook`
- `context/AuthContext.tsx` — Auth state, Google sign-in
- `lib/supabase.ts` — Supabase client
- `supabase/migrations/` — DB şeması ve RLS

## Lisans

Private.
