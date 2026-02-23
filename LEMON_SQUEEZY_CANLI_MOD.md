# Lemon Squeezy: Test Modundan Canlı Moda Geçiş Checklist

Mağazan aktif oldu ama paketler hâlâ test modunda görünüyorsa bu rehberi takip et.

---

## Neden Test Modunda Görünüyor?

Lemon Squeezy'de **test** ve **canlı** mod tamamen ayrı ortamlardır:

- **Test API key** → Sadece test verilerine erişir (test checkout, test satışlar)
- **Canlı API key** → Gerçek ödemeler, gerçek webhook

Aynı API endpoint (`api.lemonsqueezy.com`) kullanılır; hangi modda olduğun **kullandığın API key** ile belirlenir.

---

## Adım Adım Checklist

### 1. Lemon Squeezy Dashboard'da Live Mode'a Geç

- [ ] [app.lemonsqueezy.com](https://app.lemonsqueezy.com) → Giriş yap
- [ ] Sol altta **Test** / **Live** toggle'ı bul
- [ ] **Live** moduna geç

### 2. Ürünleri Canlı Moda Kopyala

Test modda oluşturduğun ürünler canlı modda **yoktur**. Kopyalaman gerekir:

- [ ] **Products** → Her kredi paketi (Mini, Dreamer, Diamond, Mega vb.) için **Copy to Live Mode** tıkla
- [ ] **ÖNEMLİ:** Kopyalandığında variant ID'ler **değişir**. Her ürünün **Variants** sekmesinden yeni ID'leri not al

Örnek format:
```
Mini:    1327319 → 12345678 (yeni canlı variant ID)
Dreamer: 1327435 → 12345679
Diamond: 1327438 → 12345680
Mega:    1327448 → 12345681
```

### 3. Canlı Mod API Key Oluştur

- [ ] **Settings → API** (veya Account → API)
- [ ] **Live mode**'da olduğundan emin ol
- [ ] **Create API Key** → Yeni key oluştur, kopyala
- [ ] Bu key'i `LEMON_SQUEEZY_API_KEY` olarak kullanacaksın

### 4. Canlı Mod Webhook Ekle

Test ve canlı webhook'lar ayrıdır. Canlı store için ayrı webhook gerekir:

- [ ] **Settings → Webhooks**
- [ ] **Create webhook** (Live mode'da)
- [ ] **Callback URL:** `https://dreemart.app/api/lemon-squeezy-webhook` (veya production domain'in)
- [ ] **Events:** `order_created` (tek seferlik satışlar için)
- [ ] **Signing secret** oluştur/kopyala → `LEMON_SQUEEZY_WEBHOOK_SECRET`

### 5. Store ID Kontrolü

- [ ] **Settings → Stores** → Mağaza ID'sini kontrol et
- [ ] Test ve Live aynı store için genelde aynı ID'dir; yine de doğrula
- [ ] Bu değer `LEMON_SQUEEZY_STORE_ID`

### 6. Vercel Environment Variables Güncelle

- [ ] Vercel Dashboard → Proje → **Settings → Environment Variables**
- [ ] `LEMON_SQUEEZY_API_KEY` → Canlı mod API key ile değiştir
- [ ] `LEMON_SQUEEZY_WEBHOOK_SECRET` → Canlı webhook signing secret ile değiştir
- [ ] `LEMON_SQUEEZY_STORE_ID` → Gerekirse güncelle

### 7. Admin Panelde Variant ID'leri Güncelle

- [ ] Dreemart Admin → **Kredi Paketleri**
- [ ] Her paket için **Lemon Squeezy variant ID** alanını **canlı moddaki** yeni ID ile güncelle
- [ ] Kaydet

### 8. Redeploy

- [ ] Vercel → **Deployments** → Son deployment → **Redeploy** (veya yeni bir commit push et)
- [ ] Env değişkenleri güncellendiyse redeploy gerekebilir

---

## Canlı Test

1. Dreemart'ta giriş yap
2. Kredi paketi satın al
3. Checkout sayfası **test mode** yazısı göstermemeli
4. Gerçek kart ile (küçük tutarla) ödeme yap
5. Webhook geldi mi kontrol et:
   - Supabase → `lemon_squeezy_sales` tablosunda yeni satış
   - Admin → Satışlar sayfasında görünmeli
6. Krediler hesaba yansımalı

---

## Sorun Giderme

| Belirti | Olası neden |
|---------|--------------|
| Checkout'ta "Test mode" yazıyor | Hâlâ test API key kullanılıyor; Vercel env kontrol et, redeploy yap |
| Webhook gelmiyor, satış görünmüyor | Canlı webhook tanımlı mı? Signing secret doğru mu? |
| "Variant not found" veya checkout açılmıyor | Variant ID'ler test moddakiler; canlı mod variant ID'leri ile değiştir |
| Store ID hatası | Lemon Squeezy Settings → Stores'dan canlı store ID'sini al |
