# GTM + Meta Pixel Kurulumu

Meta Pixel verisi akışı için Google Tag Manager (GTM) kullanımı önerilir.

## 1. Environment

`.env` dosyasına ekle:

```
VITE_GTM_ID=GTM-XXXXXXX
```

(GTM container ID’ni tagmanager.google.com → Container’dan al)

## 2. GTM Variables

1. **metaEvent** – Data Layer Variable, Name: `metaEvent`
2. **metaParams** – Data Layer Variable, Name: `metaParams`
3. Parametreler için (Purchase, InitiateCheckout vb.): `metaParams.value`, `metaParams.order_id` vb. – Data Layer Variable, Name: `metaParams.value` gibi

## 3. Trigger

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
  var p = {{metaParams}};
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
