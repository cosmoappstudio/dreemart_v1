/** Tarayıcı özelliklerinden cihaz parmak izi üretir. Aynı cihazda tutarlı kalır. */
export async function getDeviceFingerprint(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator as Navigator & { languages?: string[] }).languages?.join(',') ?? '',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency || 0),
  ];
  const str = parts.join('|');
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64);
}
