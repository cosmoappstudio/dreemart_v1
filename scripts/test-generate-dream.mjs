/**
 * Görsel + yorum modellerini test eder (Replicate: Imagen-4 + Claude)
 * Run: node --env-file=.env scripts/test-generate-dream.mjs
 */
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';

const DREAM_PROMPT = 'Sonsuz bir merdivenden çıkıyordum. Gökyüzü mor ve turuncu renklerle doluydu, ayaklarımın altında bulutlar vardı. Uzakta altın bir kapı görünüyordu.';
const ARTIST = {
  id: 'van-gogh',
  name: 'Van Gogh',
  styleDescription: 'oil painting, thick impasto strokes, swirling clouds, starry night style, vibrant blues and yellows, post-impressionism, expressive',
};

const IMAGE_MODEL = 'google/imagen-4';
const INTERPRETATION_MODEL = 'google/gemini-2.5-flash';

function buildImageInput(prompt) {
  return {
    prompt,
    aspect_ratio: '1:1',
    safety_filter_level: 'block_only_high',
    output_format: 'png',
  };
}

function extractImageUrl(output) {
  if (typeof output === 'string' && output.startsWith('http')) return output;
  if (Array.isArray(output) && output[0]) {
    const first = output[0];
    if (typeof first === 'string') return first;
    if (first?.url) return typeof first.url === 'string' ? first.url : first.url();
  }
  if (output?.url) return typeof output.url === 'string' ? output.url : output.url?.();
  return '';
}

async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || token.length < 10) {
    console.error('Hata: REPLICATE_API_TOKEN .env içinde tanımlı değil.');
    process.exit(1);
  }

  let artist = ARTIST;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: rows } = await supabase.from('artists').select('id, name, style_description').eq('is_active', true).limit(1);
    if (rows?.length) artist = { id: rows[0].id, name: rows[0].name, styleDescription: rows[0].style_description };
  }

  const replicate = new Replicate({ auth: token });
  const imagePrompt = `Create a masterpiece painting of the following scene in the style of ${artist.name}. Style description: ${artist.styleDescription}. The scene is based on this dream: "${DREAM_PROMPT}". Make it atmospheric, artistic, and evocative.`;
  const interpretPrompt = `Act as a dream interpretation expert and a mystical sage. Interpret the following dream for the user. Tone: Gentle, mysterious, and insightful. Dream: "${DREAM_PROMPT}". IMPORTANT: Provide the response in Turkish language. Keep the response under 3 short paragraphs.`;

  console.log('Rüya:', DREAM_PROMPT);
  console.log('Sanatçı:', artist.name);
  console.log('');

  // 1. Görsel üretimi
  console.log('Görsel üretiliyor (Imagen-4)...');
  const startImg = Date.now();
  const imgInput = buildImageInput(imagePrompt);
  const imgOutput = await replicate.run(IMAGE_MODEL, { input: imgInput });
  const imageUrl = extractImageUrl(imgOutput);
  console.log(`✓ Görsel hazır (${((Date.now() - startImg) / 1000).toFixed(1)}s): ${imageUrl || '(URL alınamadı)'}`);

  // 2. Rüya yorumu
  console.log('Rüya yorumu yazılıyor (Gemini 2.5 Flash)...');
  const startInterp = Date.now();
  const interpOutput = await replicate.run(INTERPRETATION_MODEL, {
    input: { prompt: interpretPrompt, max_output_tokens: 500 },
  });
  const interpretation = Array.isArray(interpOutput) ? interpOutput.join('') : String(interpOutput ?? '');
  console.log(`✓ Yorum hazır (${((Date.now() - startInterp) / 1000).toFixed(1)}s):`);
  console.log('---');
  console.log(interpretation);
  console.log('---');
  console.log('Test tamamlandı.');
}

main().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
