# Supabase Entegrasyon Planı: Web ↔ dream-app

Bu dokümanda **web (dreemart_v1-2)** ve **dream-app (React Native/Expo)** projelerinin aynı Supabase projesini kullanması için yapılacaklar planlanmıştır. Admin panel korunacak; app yayına girdiğinde web geçici kapatılıp sonra tekrar açılacak.

---

## 1. Mevcut Durum Özeti

### Web (dreemart_v1-2)
| Özellik | Değer |
|---------|-------|
| Supabase projesi | `lmtwmnvnzizmkfotnymz.supabase.co` |
| Auth | Google OAuth + Supabase Auth |
| Krediler | `profiles.credits` + Lemon Squeezy |
| Rüya üretimi | Vercel API `/api/generate-dream` |
| Tablolar | `dreams`, `artists`, `profiles`, `credit_transactions`, vb. |

### dream-app (React Native/Expo)
| Özellik | Değer |
|---------|-------|
| Supabase projesi | `liqhmvzjpqpfhvcrjmhc.supabase.co` **(farklı!)** |
| Auth | Anonymous Supabase Auth |
| Krediler | RevenueCat (CRD virtual currency) |
| Rüya üretimi | Edge Function `generate_dream` **(henüz yok)** |
| Tarih sorgusu | `dream_history` tablosu **(web'de `dreams`)** |

---

## 2. Uyumsuzluklar ve Çözümler

### 2.1 Tablo: `dream_history` vs `dreams`
- **App** → `dream_history` kullanıyor
- **Web** → `dreams` tablosu var, `dream_history` yok

**Çözüm (2 seçenek):**

| Seçenek | Açıklama |
|---------|----------|
| **A) VIEW** | `dream_history` adında bir view oluştur: `CREATE VIEW dream_history AS SELECT * FROM dreams;` — App kodu değişmez |
| **B) App güncellemesi** | App'te `dream_history` → `dreams` olarak değiştir (tek satır) |

**Öneri:** B – Daha temiz, gereksiz view yok.

---

### 2.2 Rüya üretimi: Edge Function vs Vercel API
- **App** → `callEdgeFunction('generate_dream', {...})` çağırıyor
- **Web** → Vercel'de `api/generate-dream.ts` çalışıyor
- **Sorun:** App için `generate_dream` Edge Function tanımlı değil; web kapalıyken API erişilemez

**Çözüm:** Supabase Edge Function `generate_dream` oluşturup deploy et.

- Web kapalı olsa bile Supabase açık kalır → app çalışmaya devam eder
- Mantık: `api/generate-dream.ts` port edilir
- App tarafında **kredi kontrolü yapılmaz** (RevenueCat hallediyor)
- Edge Function: Replicate çağrısı → Storage'a yükleme → `dreams` insert

---

### 2.3 Auth: Google vs Anonymous
- **Web** → Google OAuth, `auth.users` + `profiles`
- **App** → Anonymous auth, yine `auth.users` + `profiles`

**Uyum:** Web’deki `handle_new_user` trigger’ı her `auth.users` insert’ünde tetikleniyor; anonymous için de geçerli. Anonymous’ta email yok → `initial_credits = 0` (app zaten RevenueCat kullanıyor, bu sorun değil).

**Eylem:** Ek bir Supabase ayarı gerekmez, mevcut trigger yeterli.

---

### 2.4 Artists tablosu: `is_pro`
- **App** → `row.is_pro` kullanıyor (Pro sanatçı kilidi)
- **Web** → `artists` tablosunda `is_pro` yok

**Çözüm:** App tarafında `isPro: row.is_pro ?? false` kullanılıyor; eksikse `false` olur. Ek migration gerekmez. İleride `is_pro` eklersek otomatik çalışır.

---

## 3. Uygulama Planı (Adım Adım)

### Faz 1: Supabase Ortak Kullanımı

| # | Görev | Açıklama |
|---|-------|----------|
| 1.1 | dream-app `.env` güncellemesi | Web’in Supabase URL ve anon key’i kullanılacak |
| 1.2 | Web Supabase bilgilerini kopyala | `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini al |

**dream-app `.env` örneği:**
```env
# Web projesiyle AYNI Supabase
EXPO_PUBLIC_SUPABASE_URL=https://lmtwmnvnzizmkfotnymz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<web'deki anon key>
```

---

### Faz 2: App Kod Güncellemeleri

| # | Dosya | Değişiklik |
|---|-------|------------|
| 2.1 | `src/app/(tabs)/history/index.tsx` | `.from('dream_history')` → `.from('dreams')` |
| 2.2 | — | Select kısmı aynı kalır: `artists:artist_id (name)` — `dreams` tablosunda `artist_id` var |

---

### Faz 3: Supabase Edge Function – `generate_dream`

**Konum:** Web projesinde `supabase/functions/generate_dream/` oluşturulacak veya dream-app repo’sunda `supabase/functions/generate_dream/`.

**Mantık:** `api/generate-dream.ts` port edilecek, ancak:
- Kredi kontrolü yapılmayacak
- `credit_transactions` insert edilmeyecek
- `profiles.credits` güncellenmeyecek
- Sadece: Replicate → Storage → `dreams` insert

**Giriş parametreleri (app’ten gelen):**
```json
{
  "user_id": "<anon-uuid>",
  "prompt": "rüya metni",
  "style": "<artist_id-uuid>",
  "language": "tr"
}
```

**Supabase secrets:**
- `REPLICATE_API_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` (Storage upload için admin client)

**Deploy:**
```bash
supabase functions deploy generate_dream --project-ref lmtwmnvnzizmkfotnymz
```

---

### Faz 4: RLS ve Anonymous Auth

| Kontrol | Durum |
|---------|-------|
| `dreams` RLS | `auth.uid() = user_id` – Anonymous user’da da `auth.uid()` var ✓ |
| `profiles` oluşturma | `handle_new_user` trigger anonymous için de çalışıyor ✓ |
| Storage `dream-images` | Service role ile upload yapılacak – Edge Function kullanacak ✓ |

---

### Faz 5: Create Ekranı Uyumu

| Kontrol | Durum |
|---------|-------|
| `style` parametresi | App `selectedStyle` = `row.id` (artist UUID) gönderiyor ✓ |
| `artistId` | Web API `artistId` bekliyor – Edge Function’da `style` → `artistId` eşlemesi ✓ |

---

## 4. Özet Checklist

- [ ] **1.1** dream-app `.env`: Web Supabase URL + anon key
- [ ] **2.1** history/index.tsx: `dream_history` → `dreams`
- [ ] **3.1** Supabase Edge Function `generate_dream` oluştur
- [ ] **3.2** `generate_dream`: Web API mantığı (Replicate + Storage + dreams insert), kredi kontrolü yok
- [ ] **3.3** Edge Function deploy + `REPLICATE_API_TOKEN` secret
- [ ] **4** Test: Anonymous giriş → rüya oluştur → history’de görünmesi

---

## 5. Admin Panel ve Web

- Admin panel tüm işlemlerini mevcut Supabase üzerinden yapmaya devam eder
- `dreams` tablosu web ve app’ten gelen kayıtları birlikte içerir
- Web kapatıldığında: admin panele erişim kesilir; app ve Supabase çalışır
- Web tekrar açıldığında: her şey eski haline döner

---

## 6. Opsiyonel: dream_history View (App Değişmeden)

App’i değiştirmek istemezseniz, Supabase’e şu migration eklenebilir:

```sql
-- supabase/migrations/033_dream_history_view.sql
CREATE OR REPLACE VIEW dream_history AS SELECT * FROM dreams;
```

Sonrasında RLS `dreams` tablosundan view üzerinden de uygulanır; app’te sadece `.env` ve Edge Function ayarları güncellenir.
