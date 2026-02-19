/**
 * Replicate API test - minimal call to verify token works
 * Run: node --env-file=.env scripts/test-replicate.mjs
 */
import Replicate from 'replicate';

const token = process.env.REPLICATE_API_TOKEN;
if (!token || token.length < 10) {
  console.error('Hata: REPLICATE_API_TOKEN .env içinde tanımlı değil veya geçersiz.');
  process.exit(1);
}

const replicate = new Replicate({ auth: token });

console.log('Replicate API test ediliyor...');
try {
  const output = await replicate.run('replicate/hello-world:9dcd6d78e7c6560c340d916fe32e9f24aabfa331e5cce95fe31f77fb03121426', {
    input: { text: 'Replicate OK' },
  });
  console.log('✓ Replicate API çalışıyor. Yanıt:', output);
} catch (e) {
  console.error('✗ Replicate hatası:', e.message);
  process.exit(1);
}
