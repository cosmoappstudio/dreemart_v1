# DreamInk Backend Kurulum Rehberi

**Domain:** dreemart-v1.vercel.app (production); isteğe bağlı özel domain: dreemart.app

**Sadece senin yapman gerekenlerin kısa listesi → [SADECE_SENDEN_ISTENENLER.md](./SADECE_SENDEN_ISTENENLER.md)**

Bu rehber, verdiğin Supabase / Replicate / Paddle bilgileriyle backend’i tek seferde ayağa kaldırman için.

---

## 1. Supabase: Tek SQL ile tüm tablolar

1. **Supabase Dashboard** → [supabase.com/dashboard](https://supabase.com/dashboard) → projen: `lmtwmnvnzizmkfotnymz`
2. Sol menüden **SQL Editor** → **New query**
3. Projedeki `supabase/run-all-migrations.sql` dosyasının **tüm içeriğini** kopyala ve yapıştır
4. **Run** (veya Ctrl+Enter)

Hata alırsan (örn. "type already exists"): Proje daha önce kısmen kurulduysa, sadece hata veren blokları atlayıp devam edebilirsin; ya da projeyi sıfırlayıp tekrar çalıştırabilirsin.

**Storage:** Migration içinde `artist-avatars` bucket’ı da tanımlı. Hata alırsan **Storage** → **New bucket** → id: `artist-avatars`, Public: açık.

---

## 2. Supabase: Service Role Key

API (Vercel serverless) için **service_role** key gerekli:

1. Supabase Dashboard → **Project Settings** (sol alttaki dişli) → **API**
2. **Project API keys** bölümünde **service_role** (secret) → **Reveal** → kopyala
3. Bu değeri hem local `.env` hem de ileride Vercel Environment Variables’a `SUPABASE_SERVICE_ROLE_KEY` olarak ekleyeceksin (asla repoya koyma).

---

## 3. Supabase: Google ile giriş

1. **Authentication** → **Providers** → **Google** → Enable
2. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create Credentials** → OAuth 2.0 Client ID
   - Application type: **Web application**
   - **Authorized redirect URIs**’e **tek satır olarak** şunu ekle (kopyala-yapıştır, sonunda boşluk/slash olmasın):
   ```
   https://lmtwmnvnzizmkfotnymz.supabase.co/auth/v1/callback
   ```
   - **Authorized JavaScript origins**’e (opsiyonel ama önerilir): `https://lmtwmnvnzizmkfotnymz.supabase.co` ve `http://localhost:5173`, `http://localhost:5174`
3. Client ID ve Client Secret’ı kopyala → Supabase Google provider alanlarına yapıştır → Save

**Hata: "Error 400: redirect_uri_mismatch"**  
Google’da **Authorized redirect URIs** listesinde yukarıdaki adresin **birebir** (https, yol `/auth/v1/callback`, sonda slash yok) görünmesi gerekir. Ekledikten sonra birkaç dakika bekleyip tekrar dene. Hâlâ olursa Google’daki “error details” linkinden gönderilen `redirect_uri` değerini kontrol et; listedeki ile aynı olmalı.

---

## 4. Local .env dosyası

Proje kökünde `.env` oluştur (veya `.env.local`). Aşağıdakileri kendi değerlerinle doldur:

```env
# Supabase (senin proje)
VITE_SUPABASE_URL=https://lmtwmnvnzizmkfotnymz.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase Dashboard → Settings → API → anon public>
SUPABASE_SERVICE_ROLE_KEY=<Supabase Dashboard → Settings → API → service_role>

# Replicate (replicate.com → Account → API tokens)
REPLICATE_API_TOKEN=<Replicate API token>

# Paddle (şimdilik boş bırakabilirsin)
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
VITE_PADDLE_CHECKOUT_URL=

# Local geliştirme için boş bırak
VITE_APP_URL=
```

- **Anon key** ve **Replicate token**’ı zaten paylaştın; bunları `.env`’e yaz (repoya commit etme).
- **SUPABASE_SERVICE_ROLE_KEY**’i yalnızca Supabase Dashboard’dan alıp yukarıdaki gibi ekle.

---

## 5. İlk giriş ve admin ataması

1. Local’de `npm run dev` çalıştır
2. Uygulamada **Google ile Giriş Yap** → `gokturk4business@gmail.com` ile giriş yap
3. Supabase **SQL Editor**’da aşağıdaki sorguyu çalıştır:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'gokturk4business@gmail.com';
```

4. Sayfayı yenile; `/admin` artık açılmalı (Dashboard, Örnek Rüyalar, Kredi Paketleri, Yasal Sayfalar, Site Ayarları vb.)

---

## 6. GitHub + Vercel

1. Kodu GitHub’a push et (`.env` dosyasını **asla** commit etme; `.gitignore`’da olduğundan emin ol)
2. [Vercel](https://vercel.com) → **Add New** → **Project** → Repo’yu seç
3. **Environment Variables** ekle (Production / Preview / Development hepsine aynı değerleri verebilirsin):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://lmtwmnvnzizmkfotnymz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role key) |
| `REPLICATE_API_TOKEN` | (Replicate token) |
| `PADDLE_API_KEY` | (Paddle’dan; ödeme açacaksan) |
| `PADDLE_WEBHOOK_SECRET` | (Paddle webhook secret) |
| `VITE_PADDLE_CHECKOUT_URL` | (Checkout link; ödeme açacaksan) |
| `VITE_APP_URL` | `dreemart-v1.vercel.app` (veya Vercel otomatik set eder) |

4. Deploy’dan sonra **Supabase** → **Authentication** → **URL Configuration**:
   - **Site URL:** `https://dreemart-v1.vercel.app` (veya özel domain)
   - **Redirect URLs:** `https://dreemart-v1.vercel.app`, `https://dreemart-v1.vercel.app/**`, `http://localhost:5173` (local için)

Bundan sonra production’da da Google ile giriş ve API çağrıları çalışır.

---

## 7. Paddle (ödeme)

Verdiğin **client-side token** (`live_f696de9ba331368fe7699dcdc8c`) genelde frontend’de Paddle.js ile kullanılır. Backend için:

- **Paddle Dashboard** → Developer Tools / API keys → **API Key** (server-side) → `PADDLE_API_KEY`
- **Webhooks** → yeni webhook → URL: `https://dreemart-v1.vercel.app/api/paddle-webhook` → **Webhook secret** → `PADDLE_WEBHOOK_SECRET`

Kredi paketleri için checkout link’ini Paddle’da oluşturup `VITE_PADDLE_CHECKOUT_URL` olarak ayarlayabilirsin. Mevcut kod `credits_10` / `credits_50` product ID’lerini tanıyor; farklı paketler kullanacaksan `api/paddle-webhook.ts` içindeki `CREDITS_BY_PRODUCT`’ı güncellemen gerekir.

---

## Özet kontrol listesi

- [ ] `supabase/run-all-migrations.sql` Supabase SQL Editor’da çalıştırıldı
- [ ] Supabase’te Google provider açıldı, redirect URI eklendi
- [ ] `.env` oluşturuldu; URL, anon key, service_role key, Replicate token yazıldı
- [ ] En az bir kez Google ile giriş yapıldı
- [ ] `UPDATE profiles SET role = 'admin' WHERE email = '...'` çalıştırıldı
- [ ] Repo GitHub’a push edildi, Vercel’e bağlandı
- [ ] Vercel’e tüm env değişkenleri eklendi
- [ ] Supabase URL Configuration’da Vercel domain eklendi

Bu adımlardan sonra backend (Supabase + Replicate + isteğe bağlı Paddle) production’da da kullanıma hazır olur.

---

## Domain

Production URL: **https://dreemart-v1.vercel.app**. İsteğe bağlı: **Settings → Domains**’ten `dreemart.app` ekleyip DNS’te CNAME/A kaydını tanımlayabilirsin.
