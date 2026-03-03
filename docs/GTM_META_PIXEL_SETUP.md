# GTM + Meta Pixel Kurulumu

Meta Pixel verisi akışı için Google Tag Manager (GTM) kullanımı önerilir.

## 1. Environment

`.env` dosyasına ekle:

```
VITE_GTM_ID=GTM-XXXXXXX
```

(GTM container ID’ni tagmanager.google.com → Container’dan al)

## 2. GTM Variables

1. **metaEvent** – Data Layer Variable, **Variable Type:** Data Layer Variable, **Data Layer Variable Name:** `metaEvent`
2. **metaParams** – Data Layer Variable, **Data Layer Variable Name:** `metaParams`, **Data Layer Version:** Version 2
3. Parametreler için: `metaParams.value`, `metaParams.order_id` vb. – Data Layer Variable, Name: `metaParams.value` (nested key)

## 3. Triggers

- **metaPixel** – Custom Event, Event name: `metaPixel`

## 4. Meta Pixel Tag

GTM Gallery’den **Facebook Pixel** tag’ini ekle veya Custom HTML kullan.

**Custom HTML (önerilen – tüm event’ler için tek tag):**

Trigger: Custom Event = `metaPixel`

```html
<script>
(function() {
  if (typeof fbq !== 'function') return;
  var e = {{metaEvent}};
  var p = {{metaParams}} || {};
  if (typeof p !== 'object') p = {};
  if (['PageView','Lead','InitiateCheckout','Purchase','ViewContent'].indexOf(e) !== -1) {
    fbq('track', e, p || {});
  } else {
    fbq('trackCustom', e, p || {});
  }
})();
</script>
```

**Init Tag (All Pages):** Önce Meta Pixel’i yükleyen tag – All Pages trigger ile. Bu tag, fbq’yu init eder. Yalnızca bir kez çalışmalı.

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','PIXEL_ID_BURAYA');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=PIXEL_ID_BURAYA&ev=PageView&noscript=1"/></noscript>
```

Not: İlk PageView uygulama tarafından route değişiminde gönderilir; All Pages’te ekstra PageView eklemene gerek yok.

## 5. DataLayer Yapısı

```javascript
{
  event: 'metaPixel',
  metaEvent: 'PageView' | 'Lead' | 'InitiateCheckout' | 'Purchase' | 'ViewContent' | 'paywall_opened' | ...,
  metaParams: { content_ids, value, currency, order_id, ... }  // opsiyonel
}
```

## 6. GTM Preview

1. GTM → Preview
2. Sitede dolaş, event’leri tetikle
3. Data Layer’da `metaPixel` event’lerini kontrol et

## 7. Custom Event'ler Meta'da Görünmüyorsa

- **Tag Sequencing:** Init tag, metaPixel event tag'den önce fire etmeli (metaPixel tag → Advanced Settings → Fire a tag before this tag fires → Init tag)
- GTM Preview'da metaPixel tetiklendiğinde event tag fire oluyor mu kontrol et
- Meta Events Manager → Test Events ile canlı event'leri izle
- metaParams Variable Data Layer Version 2 ile tanımlı mı?
- Gönderilen custom event'ler: cta_click, paywall_opened, dream_generated, download_clicked, share_clicked, tab_switch, pricing_pack_click, faq_open, demo_create_click, language_change, login
