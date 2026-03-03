# Google Ads Sitelinks – Dreemart

Google Ads reklamlarında sitelink olarak kullanabileceğiniz URL’ler ve önerilen metinler.

## Hash linkleri (Landing bölümleri)

Landing sayfasındaki bölümlere doğrudan gider. Sayfa yüklendiğinde otomatik scroll eder.

| Link metni (TR) | Link metni (EN) | URL |
|-----------------|-----------------|-----|
| Nasıl Çalışır | How It Works | `https://dreemart.app/#how` |
| Ücretsiz Dene | Try for Free | `https://dreemart.app/#demo` |
| Fiyatlandırma | Pricing | `https://dreemart.app/#pricing` |
| SSS | FAQ | `https://dreemart.app/#faq` |

## Sayfa linkleri

| Link metni (TR) | Link metni (EN) | URL |
|-----------------|-----------------|-----|
| Giriş Yap | Sign In | `https://dreemart.app/login` |
| Kayıt Ol | Sign Up | `https://dreemart.app/login` |
| Gizlilik Politikası | Privacy Policy | `https://dreemart.app/terms?tab=privacy` |
| Kullanım Şartları | Terms of Service | `https://dreemart.app/terms?tab=terms` |

## Google Ads’te kullanım

1. Google Ads → Kampanya → Reklamlar ve öğeler → Sitelink’ler
2. Her sitelink için:
   - **Link metni:** Yukarıdaki tablolardan uygun metin (max 25 karakter)
   - **Açıklama satırı 1–2:** İsteğe bağlı, reklam metniyle uyumlu
   - **Son URL:** Tablodaki URL’i aynen kopyalayın

## Önerilen sitelink kombinasyonu

4 sitelink için örnek seçim:

1. **Giriş Yap** → `/login`  
2. **Fiyatlandırma** → `/#pricing`  
3. **Nasıl Çalışır** → `/#how`  
4. **SSS** → `/#faq`  

## UTM parametreleri

Google Ads’te varsayılan olarak UTM eklenebilir. Sitelink URL’leri hash kullandığı için UTM’ler query string’e gelir:

```
https://dreemart.app/?utm_source=google&utm_medium=cpc&utm_campaign=brand#pricing
```

Bu formatta sayfa hem doğru bölüme scroll eder hem de UTM takibi çalışır.
