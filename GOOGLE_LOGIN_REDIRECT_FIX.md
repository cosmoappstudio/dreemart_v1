# Google Login: Sık Görülen Hatalar

## 1. redirect_uri_mismatch

Bu hata, Google OAuth’ta tanımlı “Authorized redirect URI” ile Supabase’in kullandığı adresin eşleşmemesinden kaynaklanır.

## Yapman gerekenler

### 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Kullandığın **OAuth 2.0 Client ID**’yi (Web application) aç
3. **Authorized redirect URIs** bölümüne **sadece** şu adresi ekle (kopyala-yapıştır, başında/sonunda boşluk olmasın):

   ```
   https://lmtwmnvnzizmkfotnymz.supabase.co/auth/v1/callback
   ```

4. **Save** ile kaydet

Kontrol listesi:
- `https` (http değil)
- Domain: `lmtwmnvnzizmkfotnymz.supabase.co`
- Yol: tam olarak `/auth/v1/callback` (sonda `/` yok)
- Başka bir redirect URI kullanıyorsan (örn. localhost), onu **ekleme**; Google ile girişte Supabase önce kendi callback’ine yönlendirir, bu yüzden listede mutlaka bu Supabase adresi olmalı

### 2. (İsteğe bağlı) Authorized JavaScript origins

Aynı OAuth client’ta **Authorized JavaScript origins** kısmına şunları ekleyebilirsin:

- `https://lmtwmnvnzizmkfotnymz.supabase.co`
- `http://localhost:5173`
- `http://localhost:5174`

Bunlar giriş sayfasının açıldığı origin’ler; redirect URI’den farklı.

### 3. Bekle ve tekrar dene

Google tarafında değişiklik 1–2 dakika içinde yansıyabilir. Kaydettikten sonra bir süre bekleyip uygulamada tekrar **Google ile Giriş** dene.

### 4. Hâlâ oluyorsa

Google’ın hata sayfasındaki **“error details”** (veya “developer için detaylar”) linkine tıkla. Orada **Gönderilen redirect_uri** benzeri bir alan görürsün. Bu değer, Google Console’da **Authorized redirect URIs** listesindeki satırlardan biriyle **tamamen aynı** olmalı (büyük/küçük harf, slash dahil). Farklıysa listeye bu görünen URI’yi de ekleyip kaydet ve tekrar dene.

---

## 2. Giriş sonrası sayfa dosya içeriği / kaynak kodu gibi açılıyor

**Belirti:** Google ile giriş sonrası sayfa:
- SQL metni (örn. `run-all-migrations.sql`), veya
- JavaScript/TypeScript kaynak kodu (ör. `App.tsx`’in derlenmiş hali)

olarak görünüyor.

**Sebep:** Supabase’te **Site URL** veya **Redirect URLs** içinde **dosya yolu** var. Örnekler:
- `http://localhost:5174/supabase/run-all-migrations.sql`
- `http://localhost:5174/App.tsx`
- veya başka bir path (örn. `/src/...`)

Giriş sonrası tarayıcı bu adrese gidiyor, Vite da o dosyayı (veya modülü) sayfa gibi sunuyor.

**Yapman gerekenler:**

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL** **sadece** uygulama kökü olsun, **hiç path ekleme**:
   - Local: `http://localhost:3000` (Vite varsayılan port; farklı kullanıyorsan ona göre, örn. 5173)
   - Production (Vercel): `https://dreemart-v1.vercel.app` (özel domain kullanıyorsan örn. `https://dreemart.app`)
3. **Redirect URLs** listesinde **mutlaka** şunlar olsun (eksikse `requested path is invalid` hatası alırsın):
   - `http://localhost:3000`
   - `http://localhost:3000/**`
   - `https://dreemart-v1.vercel.app`
   - `https://dreemart-v1.vercel.app/**`
   - `https://dreemart-v1.vercel.app/app` (giriş sonrası tam bu adrese yönlendiriliyoruz; bazı kurulumlarda wildcard yetmez, bu satırı da ekle)
   - (isteğe bağlı) `https://dreemart.app`, `https://dreemart.app/**`, `https://dreemart.app/app`
4. **Şunları mutlaka kaldır:** Dosya veya klasör yolu içeren tüm satırlar:
   - `.../supabase/run-all-migrations.sql`
   - `.../App.tsx`
   - `.../src/...`
   - veya `.tsx`, `.ts`, `.sql` ile biten herhangi bir URL  
   Listede böyle bir şey varsa **Delete** ile sil.
5. **Save** de, tarayıcıda tam çıkış yapıp tekrar **Google ile Giriş** dene.

Doğru ayarlarla giriş sonrası adres `http://localhost:3000/app` (veya production’da `https://dreemart-v1.vercel.app/app`) olur; tek sayfa uygulama bu path’i React Router ile işler ve arayüz normal görünür.

**Not:** İlk anda adres çubuğunda `.../app#access_token=...&refresh_token=...` gibi uzun bir hash görebilirsin. Bu normaldir; Supabase token’ları bu şekilde iletir. Uygulama bu token’ları oturuma çevirir ve adres çubuğunu otomatik olarak temizler (`/app` kalır). Sayfa kaynak kodu olarak açılmamalı; arayüz normal DreamInk ekranı olmalıdır.

### Yedek: Kaynak URL yönlendirmesi (projede eklendi)

Vite ayarlarına, **yanlışlıkla** `/App.tsx` veya benzeri bir adrese gidilirse tarayıcıyı ana sayfaya (`/`) yönlendiren bir kural eklendi. Yani:

- Supabase’i doğru yapılandırdıktan sonra dev sunucuyu **yeniden başlat**: `npm run dev`
- Eğer bir link veya Supabase hâlâ `/App.tsx` gibi bir adrese gönderirse, artık otomatik olarak `/` (veya `/app`) açılacak şekilde yönlendirme yapılır; sayfa kaynak kodu olarak açılmaz.

Hâlâ aynı ekranı görüyorsan: Adres çubuğunda tam olarak ne yazıyor? (örn. `.../App.tsx`) Supabase **Redirect URLs** ve **Site URL** listesinde bu path’in **kesinlikle olmadığından** emin ol.

---

## 3. Bir mail ile giriş düzgün, başka bir mail ile kaynak kodu sayfası açılıyor

**Belirti:** Örneğin bir mail (gokturk4business@gmail.com) ile girişte yine App.tsx kaynak kodu sayfası açılıyor; başka bir mail ile girişte landing veya uygulama normal açılıyor.

**Sebep:** O hesapla daha önce yanlış bir URL'e (örn. `/App.tsx`) yönlendirme yapılmış olabilir; Supabase veya tarayıcı bunu hatırlıyor. **Site URL** veya **Redirect URLs** içinde hâlâ yanlış bir satır varsa bazen o kullanılabiliyor.

**Yapman gerekenler:**

1. **Supabase'i sadeleştir:** Authentication → URL Configuration. **Site URL** sadece `http://localhost:3000`. **Redirect URLs** sadece `http://localhost:3000` ve `http://localhost:3000/**`. Listede `.tsx`, `App`, `index` veya dosya yolu geçen satır olmasın; varsa sil, Save.

2. **Sorunlu hesabı temiz dene:** localhost için çerezleri/site verilerini temizle. **Gizli pencere** aç, adres çubuğuna `http://localhost:3000` yaz, Google ile Giriş'e tıkla, sorunlu maili seç. Giriş sonrası adres `.../app` veya `.../app#access_token=...` olmalı.

3. **Hâlâ aynı hesapla bozuksa:** Supabase → Authentication → Users; Redirect URLs listesini tekrar kontrol et, sadece kök adresler kalsın, Save. Yine gizli pencerede dene.

---

## 4. `{"error":"requested path is invalid"}` (Vercel / production)

**Belirti:** Google ile giriş yaptıktan sonra sayfa `{"error":"requested path is invalid"}` JSON metnini gösteriyor.

**Sebep:** Supabase, giriş sonrası seni `https://dreemart-v1.vercel.app/app` adresine yönlendiriyor; bu URL, Supabase **Redirect URLs** listesinde tanımlı değilse Supabase isteği reddediyor ve bu hatayı döndürüyor.

**Yapman gerekenler:**

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL:** `https://dreemart-v1.vercel.app`
3. **Redirect URLs** listesine **şunları ekle** (yoksa):
   - `https://dreemart-v1.vercel.app`
   - `https://dreemart-v1.vercel.app/**`
   - `https://dreemart-v1.vercel.app/app`
4. **Save** → Tarayıcıda tekrar Google ile giriş dene.

---

## 5. `bad_oauth_state` / OAuth state not found or expired

**Belirti:** Giriş sonrası adres şöyle açılıyor:  
`http://localhost:3000/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired`

**Sebep:** Giriş akışı başlarken Supabase’in sakladığı “state” bilgisi, Google’dan dönüşte bulunamıyor veya süresi dolmuş. Genelde şunlarda olur:
- Google sayfası **yeni sekmede** açıldıysa veya giriş **farklı sekmede** tamamlandıysa
- Giriş başlatıldıktan sonra **uzun süre beklenip** sonra Google’da devam edildiyse
- Tarayıcı **çerezleri** localhost veya Supabase için engelliyorsa

**Ne yaptık:** Bu URL’ye düşüldüğünde uygulama seni otomatik **/login** sayfasına yönlendiriyor ve “Giriş oturumu sona erdi…” mesajı gösteriyor.

**Senin yapman gerekenler:**  
“Google ile Giriş Yap / Kayıt Ol”a **aynı sekmede** tıkla, Google’da girişi **aynı sekmede** tamamla; Google sayfasını yeni sekmede açma. Gerekirse localhost için çerezleri açık tut.
