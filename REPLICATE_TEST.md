# Replicate Kurulum Testi

Rüya görselleştirme API’sinin (Replicate) çalıştığını doğrulamak için aşağıdaki yöntemlerden birini kullanabilirsin.

## 1. Uygulama üzerinden test

1. **Giriş yap** (Google ile).
2. **Anasayfada** “Rüyanı Anlat” alanına kısa bir rüya metni yaz (örn. “Dün gece uçan bir atın sırtında bulutların arasından geçiyordum”).
3. Bir **ressam** seç, **Rüyamı Görselleştir** butonuna tıkla.
4. Birkaç tensaniye içinde:
   - Görsel oluşmalı,
   - Rüya yorumu metni gelmeli,
   - Galeriye kayıt düşmeli.

Hata alırsan tarayıcı **Geliştirici Araçları → Network** sekmesinde `generate-dream` isteğine bak; 402 = kredi yok, 401 = oturum yok, 500 = Replicate/backend hatası.

## 2. API’yi curl ile test (gelişmiş)

Geçerli bir **Supabase access token** gerekiyor (giriş yaptıktan sonra tarayıcıda `supabase.auth.getSession()` ile alınabilir veya Supabase Dashboard → Authentication → Users üzerinden test token).

```bash
# ORIGIN: canlı için https://dreemart-v1.vercel.app, local için http://localhost:5173
ORIGIN="https://dreemart-v1.vercel.app"
# ACCESS_TOKEN: Supabase JWT (Bearer token)
ACCESS_TOKEN="eyJ..."

curl -X POST "$ORIGIN/api/generate-dream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"dreamText":"Uçan bir atın sırtında bulutların arasından geçiyordum.","artistId":"<artists tablosundan bir id>","language":"tr"}'
```

Başarılı yanıt örneği:

```json
{"id":"...","imageUrl":"https://...","interpretation":"...","artistName":"...","createdAt":"..."}
```

- **401**: Token geçersiz veya eksik.
- **402**: Kredi yetersiz (Supabase’te `profiles.credits` artırılabilir).
- **500**: Replicate API hatası veya `REPLICATE_API_TOKEN` eksik/yanlış; Vercel env’i kontrol et.

## 3. Vercel ortam değişkenleri

Canlıda çalışması için Vercel’de şunlar tanımlı olmalı:

- `REPLICATE_API_TOKEN` (Replicate → Account → API tokens)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Deploy sonrası env değiştiyse **Redeploy** yap.

## 4. Replicate modelleri

Varsayılan: görsel için `google/imagen-4`, yorum için `anthropic/claude-3.5-sonnet`. Admin → Replicate sayfasından farklı model seçilebilir (ve `replicate_models` tablosu doluysa oradan okunur).
