# dreemart.app Kurulum Kontrol Listesi

Domain **dreemart.app** Vercel’e bağlandıysa aşağıdakileri sırayla yap.

---

## 1. Vercel Environment Variables

**Vercel** → Proje → **Settings** → **Environment Variables**

| Değişken | Değer | Not |
|----------|-------|-----|
| `VITE_APP_URL` | `dreemart.app` | **https ekleme** – Kod kendisi ekliyor |
| `VITE_ADMIN_PATH` | `yonetimofisi` | İsteğe bağlı |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase’ten |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase’ten |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase’ten |
| `REPLICATE_API_TOKEN` | `r8_...` | Replicate’ten |

**Sonrasında:** Değişiklikten sonra yeni bir deploy tetikle (ör. boş commit + push).

---

## 2. Supabase – Authentication → URL Configuration

**Supabase** → **Authentication** → **URL Configuration**

**Site URL:**
```
https://dreemart.app
```

**Redirect URLs** – Listede şunlar olsun (her satır ayrı):

```
https://dreemart.app
https://dreemart.app/**
https://dreemart.app/app
https://dreemart.app/yonetimofisi
https://dreemart.app/yonetimofisi/login
http://localhost:5173
http://localhost:5173/**
```

Admin panele giriş için `yonetimofisi` ve `yonetimofisi/login` mutlaka olmalı.

**Save** ile kaydet.

---

## 3. Supabase – Yeni Kullanıcıya 3 Kredi

**Supabase** → **SQL Editor** → New query

Aşağıdaki SQL’i çalıştır:

```sql
-- supabase/migrations/011_handle_new_user_credits.sql içeriği
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username, credits)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'email',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'rüyacı_' || substr(md5(NEW.id::text || gen_random_uuid()::text), 1, 10),
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Bu sayede her yeni kullanıcıya otomatik 3 kredi verilir.

---

## 4. Supabase – Mevcut Kullanıcılara Kredi + Admin Rolü

**SQL Editor**'de:

```sql
-- 0 kredili kullanıcılara 3 kredi ver
UPDATE profiles SET credits = 3 WHERE credits = 0;

-- Kendi mailine admin yetkisi ver (mail adresini değiştir)
UPDATE profiles SET role = 'admin' WHERE email = 'SENIN@EMAIL.com';
```

---

## 5. Kredi/Username Güncellemesi Uygulamada Görünmüyorsa

Supabase Table Editor’dan `profiles` tablosunda kredi veya username güncellediğinde uygulama hemen yansıtmayabilir.

**Uygulama tarafında:**
- Profil sekmesine geç → Otomatik yenileme var
- Header’daki **yenile** (RefreshCw) butonuna bas

**Admin panelinden kredi güncelleme:**
- `/yonetimofisi` → Kullanıcılar → Kredi alanını değiştir veya "Ekle" ile hediye kredi ver
- Bu işlem API üzerinden (`/api/admin/set-credits`) service role ile yapıldığı için Supabase tarafında güncelleme hemen uygulanır

---

## 6. Admin Panele Giriş

1. Tarayıcıda `https://dreemart.app/yonetimofisi` adresine git
2. Admin giriş ekranı açılacak
3. **Google ile Giriş Yap**
4. Giriş yaptığın hesabın `profiles.role = 'admin'` olmalı (yukarıdaki SQL ile ayarlayabilirsin)

**Dashboard’a atıyorsa (admin değilsin): SQL Editor'da `UPDATE profiles SET role = 'admin' WHERE email = 'SENIN@EMAIL.com';` veya `012_fix_admin_credits_diagnostic.sql` çalıştır, sayfayı yenile (F5) veya çıkış yapıp tekrar giriş yap. Redirect sorunu varsa: Supabase Redirect URLs'de yonetimofisi ve yonetimofisi/login olmalı.

---

## 7. Paddle Webhook (Ödeme)

**Paddle** → Checkout / Webhook ayarlarında:

- Lemon Squeezy webhook URL: `https://dreemart.app/api/lemon-squeezy-webhook`
- Paddle (eski) webhook URL: `https://dreemart.app/api/paddle-webhook`

---

## "infinite recursion detected in policy for relation profiles" Hatası

Bu hata, `profiles` tablosundaki RLS policy'lerinin kendi tablolarını sorgulamasından kaynaklanır. **Supabase SQL Editor**'da `014_fix_profiles_rls_recursion.sql` dosyasının tamamını çalıştır. Bu migration `is_admin()` adında SECURITY DEFINER bir fonksiyon ekler ve policy'leri buna göre günceller; sonsuz döngü ortadan kalkar.

---

## Table Editor / RLS Nedeniyle Kredi/Role Güncelleme Çalışmıyorsa

Supabase **Table Editor** RLS yüzünden güncellemeyi engelleyebilir. **SQL Editor** kullan:

1. Önce `013_rls_fix_admin_credits.sql` içeriğini çalıştır (fonksiyon tanımı)
2. Sonra şu satırı çalıştır (email'i değiştir):

```sql
SELECT * FROM set_admin_and_credits('gokturk4business@gmail.com', 10);
```

Bu fonksiyon `SECURITY DEFINER` ile çalıştığı için RLS'i bypass eder ve admin + kredi ataması yapar. Alternatif olarak `012_fix_admin_credits_diagnostic.sql` da deneyebilirsin.

---

## Kontrol Listesi

- [ ] Vercel’de `VITE_APP_URL=dreemart.app` tanımlı
- [ ] Supabase Site URL = `https://dreemart.app`
- [ ] Supabase Redirect URLs’de dreemart.app ve yonetimofisi var
- [ ] `011_handle_new_user_credits.sql` çalıştırıldı
- [ ] `015_realtime_profiles.sql` çalıştırıldı (profil/kredi anlık güncelleme)
- [ ] `016_social_links_and_site_assets.sql` çalıştırıldı (footer sosyal linkleri, logo upload)
- [ ] **"infinite recursion" hatası varsa:** `014_fix_profiles_rls_recursion.sql` çalıştırıldı (öncelikli)
- [ ] Admin/kredi RLS engelliyorsa: `013_rls_fix_admin_credits.sql` çalıştırıldı, `set_admin_and_credits('email', 10)` çağrıldı
- [ ] `profiles.role = 'admin'` kendi hesabına atandı
- [ ] Yeni deploy yapıldı (Vercel)
