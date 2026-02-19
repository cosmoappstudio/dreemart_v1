# DreamInk — Proje Planı

Rüyaları ünlü ressamların tarzında sanat eserine çeviren ve yorumlayan AI tabanlı web uygulaması. Full-stack geliştirme, ödeme ve admin paneli dahil.

---

## 1. Mevcut Tasarım Özeti (Google AI Studio)

- **Uygulama:** DreamInk — React + Vite + TypeScript, Tailwind CSS
- **Akış:** Rüya metni → Ressam tarzında görsel (AI) + Rüya yorumu (AI) → Galeri & detay
- **Şu anki AI:** Gemini (görsel + yorum); **hedef:** Replicate Imagen-4 + Claude 3.5 Sonnet
- **Kullanıcı modeli:** Kredi, tier (FREE/PRO), geçmiş, dil (TR/EN/ES/DE)
- **Monetizasyon:** Abonelik (haftalık/aylık) + kredi paketleri; **hedef:** Sadece kredi satışı + Paddle
- **Ressamlar:** Sabit liste (Van Gogh, Dalí, Monet, Picasso, Kahlo, Escher, Osman Hamdi), her biri `styleDescription` ile

Bu plan, bu tasarımı production’a taşır: Supabase, Google SSO, Paddle, Replicate, admin paneli, Vercel.

---

## 2. Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS (mevcut yapı korunur) |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Auth** | Supabase Auth + Google SSO |
| **Ödeme** | Paddle (kredi paketleri, webhook’lar) |
| **Görsel üretimi** | Replicate — Imagen-4 |
| **Rüya yorumu** | Replicate — Claude 3.5 Sonnet |
| **Admin paneli** | Aynı repo, `/admin` route, role-based erişim |
| **Deploy** | Vercel (frontend + API routes / serverless) |

---

## 3. Mimari Genel Bakış

```
[Kullanıcı] → [Vercel: Next.js/React App]
                    ↓
              [Supabase]
              · Auth (Google SSO)
              · PostgreSQL (users, dreams, artists, credits, orders)
              · Storage (dream images)
              · Edge Functions (opsiyonel: Paddle webhook, moderation)
                    ↓
              [Replicate API]
              · Imagen-4 (görsel)
              · Claude 3.5 Sonnet (yorum)
                    ↓
              [Paddle] (checkout, webhooks → Supabase)
```

- **Admin:** Aynı domain’de `/admin`; sadece `admin` rolüne sahip kullanıcılar erişir.

---

## 4. Veritabanı Şeması (Supabase / PostgreSQL)

### 4.1 `profiles` (Supabase Auth ile eşleşir)

- `id` (uuid, PK, auth.users.id)
- `email`, `full_name`, `avatar_url` (Google’dan)
- `language` (tr, en, es, de)
- `credits` (integer, default 3 — hoş geldin kredisi)
- `tier` (enum: free, pro) — ileride abonelik açılırsa
- `is_banned` (boolean), `ban_reason`, `banned_at`
- `created_at`, `updated_at`

### 4.2 `artists`

- `id` (uuid, PK)
- `slug` (unique, örn: vangogh)
- `name` (örn: Van Gogh)
- `style_description` (prompt için)
- `image_url` (avatar)
- `is_active` (boolean)
- `sort_order` (integer)
- `created_at`, `updated_at`

*(Admin: yeni ressam ekleme, düzenleme, prompt güncelleme.)*

### 4.3 `dreams`

- `id` (uuid, PK)
- `user_id` (FK → profiles)
- `prompt` (rüya metni)
- `artist_id` (FK → artists)
- `image_url` (Storage path veya public URL)
- `interpretation` (Claude yorumu)
- `moderation_status` (pending, approved, rejected)
- `created_at`

### 4.4 `credit_transactions`

- `id` (uuid, PK)
- `user_id` (FK)
- `amount` (+ veya -)
- `reason` (welcome, purchase, dream_used, admin_adjustment, refund)
- `reference_id` (Paddle order_id vb.)
- `created_at`

### 4.5 `prompt_templates` (admin tarafından güncellenebilir)

- `id` (uuid, PK)
- `key` (örn: dream_image_system, dream_interpretation_system)
- `content` (text, prompt metni)
- `updated_at`, `updated_by`

*(Admin panelinden “prompt güncelleme” bu tabloya yazılır.)*

### 4.6 `paddle_*` (Paddle webhook idempotency / log)

- Webhook’ları işleyip kredi eklerken duplicate’ı önlemek için `paddle_webhook_events` (event_id unique) veya benzeri bir tablo.

### 4.7 Storage (Supabase Storage)

- Bucket: `dream-images`, policy: sadece ilgili user veya admin erişebilir; public URL’ler signed veya public read (tercihe göre).

---

## 5. Auth — Google SSO (Supabase)

- Supabase Dashboard → Authentication → Providers → Google açılır.
- Frontend: `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- İlk girişte `profiles` satırı oluşturulur (trigger veya app logic ile): `credits = 3`, `tier = free`, `language = tr`.
- Admin: `profiles` içinde `role` (user | admin) veya ayrı `admin_users` tablosu; admin paneli sadece `role = admin` için açılır.

---

## 6. AI Entegrasyonu (Replicate)

### 6.1 Görsel: Imagen-4

- **Servis:** Backend’de (Supabase Edge Function veya Vercel Serverless API) Replicate client ile Imagen-4 modeli çağrılır.
- **Input:** Rüya metni + `artists.style_description` birleştirilerek tek prompt (veya `prompt_templates` ile şablon kullanılır).
- **Output:** URL veya buffer → Supabase Storage’a yüklenir, `dreams.image_url` güncellenir.
- **Güvenlik:** API key sunucuda tutulur; kullanıcı doğrudan Replicate’e erişmez.

### 6.2 Rüya yorumu: Claude 3.5 Sonnet

- **Servis:** Aynı backend katmanında Replicate üzerinden Claude 3.5 Sonnet çağrılır.
- **Input:** Rüya metni + dil (TR/EN/ES/DE); `prompt_templates` ile sistem prompt’u admin’den güncellenebilir.
- **Output:** Metin → `dreams.interpretation` alanına yazılır.

### 6.3 Kredi ve moderasyon

- Her “rüya oluştur” isteği: 1 kredi düşülür (FREE kullanıcılar için); kredi yoksa 402/upgrade mesajı.
- İsteğe bağlı: Üretim sonrası otomatik veya admin incelemesi için `dreams.moderation_status` (pending → approved/rejected); şüpheli içerikler admin panelinde listelenir.

---

## 7. Ödeme — Paddle

- **Ürünler:** Sadece kredi paketleri (örn: 10 kredi, 50 kredi). Abonelik şimdilik plan dışı; ileride Paddle subscription eklenebilir.
- **Akış:** “Kredi Yükle” → Paddle Checkout (client veya overlay) → Ödeme tamamlanınca Paddle webhook (ör. `subscription_created` / `one-off` satış için uygun event) → Backend webhook handler.
- **Webhook handler (Vercel API route veya Supabase Edge Function):** Event’i doğrular, `credit_transactions` ve `profiles.credits` günceller; idempotency ile tekrar işleme engellenir.
- **Admin:** Satış raporu Paddle Dashboard’dan; gerekirse admin panelinde “son işlemler” için `credit_transactions` listesi.

---

## 8. Admin Paneli Özellikleri

- **Erişim:** Sadece `role = admin` (veya `admin_users` ile). Route guard: `/admin` altındaki tüm sayfalar kontrol edilir.
- **Menü / Sayfalar:**
  - **Dashboard:** Özet istatistikler (günlük/aylık rüya sayısı, kullanıcı sayısı, kredi satışları).
  - **Kullanıcı moderasyonu:** Kullanıcı listesi, arama, ban/unban, kredi manuel ekleme/azaltma.
  - **Ressamlar:** CRUD — yeni ressam ekleme, düzenleme (isim, slug, style_description, image_url, is_active, sıra).
  - **Prompt yönetimi:** `prompt_templates` tablosuna göre sistem prompt’larını düzenleme (görsel üretim, rüya yorumu, dil kuralları vb.).
  - **API / Ayarlar:** Replicate API key’i göstermeden “bağlı / hata” testi; Paddle webhook URL’i ve son event’lerin log’u (opsiyonel).
  - **İçerik moderasyonu:** `moderation_status = pending` veya “son üretilen rüyalar” listesi; onaylama/reddetme.

Teknik: Mevcut React uygulamasına `/admin` route’ları eklenir; admin layout ve role check ortak bir component ile yapılır.

---

## 9. Uygulama Akışları (Kullanıcı)

1. **Giriş:** Google ile giriş → Supabase Auth + `profiles` oluşturma/güncelleme.
2. **Ana sayfa:** Rüya metni + ressam seçimi (artists Supabase’den, `is_active = true`).
3. **Üretim:** “Rüyamı Görselleştir” → Backend’de kredi kontrolü → 1 kredi düş → Imagen-4 + Claude 3.5 Sonnet çağrısı → Görsel Storage’a, kayıt `dreams`’e → Response’ta image URL + interpretation.
4. **Galeri:** Kullanıcının `dreams` kayıtları listelenir (pagination isteğe bağlı).
5. **Profil:** Kredi, dil, “Kredi Yükle” (Paddle Checkout’a yönlendirme).
6. **Paywall:** Sadece kredi paketleri; abonelik kartları kaldırılabilir veya “Yakında” olarak bırakılabilir.

---

## 10. Güvenlik ve Ortam Değişkenleri

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (sadece backend, webhook, admin işlemleri).
- **Replicate:** `REPLICATE_API_TOKEN` (sadece backend).
- **Paddle:** `PADDLE_VENDOR_ID`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`; environment (sandbox/production).
- **Admin:** Admin listesi Supabase’de (örn. `profiles.role` veya `admin_users`) ile yönetilir; hassas işlemler service role ile.

---

## 11. Vercel ile Yayınlama

- Repo: Git (GitHub/GitLab) → Vercel’e bağlanır.
- **Build:** `npm run build` (veya `vite build`); root’u proje root’u olarak ayarlanır.
- **Environment variables:** Vercel proje ayarlarında yukarıdaki tüm key’ler eklenir.
- **API routes:** Eğer Next.js’e geçilmezse, Paddle webhook ve Replicate çağrıları için Vercel Serverless Functions (api/*) veya Supabase Edge Functions kullanılır. Mevcut yapı Vite ise, webhook/API için ayrı bir small backend (Vercel serverless) veya sadece Edge Functions tercih edilebilir.
- **Domain:** Vercel’den özel domain atanabilir.

---

## 12. Geliştirme Fazları (Önerilen Sıra)

| Faz | İçerik | Tahmini |
|-----|--------|---------|
| **Faz 1** | Supabase kurulumu: proje, tablolar (profiles, artists, dreams, credit_transactions, prompt_templates), RLS, Storage bucket | 1–2 gün |
| **Faz 2** | Auth: Google SSO, ilk girişte profil oluşturma, frontend’de giriş/çıkış ve korumalı sayfalar | 1 gün |
| **Faz 3** | Replicate: Backend API (Vercel serverless veya Edge Function) — Imagen-4 + Claude 3.5 Sonnet; prompt’ları DB’den veya constant’tan oku | 1–2 gün |
| **Faz 4** | Kredi mantığı: Üretim öncesi/sonrası kredi düşme, `credit_transactions` kaydı; “kredi yok” paywall | 0.5 gün |
| **Faz 5** | Frontend’i Supabase’e bağlama: Artists ve dreams’i DB’den çekme, üretim sonrası kaydetme, galeri ve profil verileri | 1 gün |
| **Faz 6** | Paddle: Kredi paketleri, Checkout entegrasyonu, webhook handler, kredi ekleme | 1–2 gün |
| **Faz 7** | Admin paneli: Layout, role kontrolü, dashboard, kullanıcı listesi (moderasyon), ressam CRUD, prompt düzenleme | 2–3 gün |
| **Faz 8** | İçerik moderasyonu (opsiyonel): pending list, onay/red; Replicate/ek filtreler | 0.5–1 gün |
| **Faz 9** | Vercel deploy, env’ler, domain, son testler | 0.5–1 gün |

**Toplam:** Yaklaşık 9–14 gün (tek geliştirici, tam zamanlı varsayımıyla).

---

## 13. Kısa Özet Kararlar

- **Gelir modeli:** Sadece kredi satışı (Paddle); abonelik ilk sürümde yok.
- **Görsel:** Replicate Imagen-4; prompt = rüya + `artists.style_description` (veya admin prompt şablonu).
- **Yorum:** Replicate Claude 3.5 Sonnet; dil ve ton `prompt_templates` ile yönetilebilir.
- **Backend:** Supabase (DB, Auth, Storage) + Vercel serverless/Edge (Replicate, Paddle webhook).
- **Admin:** Aynı uygulama, `/admin`, API/moderation, ressam ve prompt yönetimi.

Bu plan, mevcut DreamInk tasarımını production’a taşımak için gerekli teknik ve iş adımlarını kapsar. İstersen bir sonraki adımda Faz 1 için somut Supabase migration SQL ve env örneklerini çıkarabiliriz.
