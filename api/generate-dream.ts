import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

type ReplicateModelRow = { key: string; model_identifier: string; input_preset: string; input_extra?: Record<string, unknown> | null };

const DEFAULT_IMAGE_MODEL = 'google/imagen-4';
const DEFAULT_INTERPRETATION_MODEL = 'google/gemini-2.5-flash';

function buildImageInput(preset: string, prompt: string, inputExtra?: Record<string, unknown> | null): Record<string, unknown> {
  const extra = inputExtra && typeof inputExtra === 'object' ? inputExtra : {};
  switch (preset) {
    case 'imagen':
      return {
        prompt,
        aspect_ratio: (extra.aspect_ratio as string) || '1:1',
        safety_filter_level: 'block_only_high',
        output_format: 'png',
        ...extra,
      };
    case 'flux':
      return { prompt, aspect_ratio: (extra.aspect_ratio as string) || '1:1', ...extra };
    default:
      return { prompt, ...extra };
  }
}

function buildInterpretationInput(_preset: string, prompt: string): Record<string, unknown> {
  return { prompt };
}

async function persistImageToStorage(admin: ReturnType<typeof getSupabaseAdmin>, replicateUrl: string): Promise<string> {
  const res = await fetch(replicateUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const ext = replicateUrl.includes('.webp') ? 'webp' : replicateUrl.includes('.jpg') || replicateUrl.includes('.jpeg') ? 'jpg' : 'png';
  const path = `dreams/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from('dream-images').upload(path, buffer, {
    contentType: res.headers.get('content-type') || `image/${ext}`,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = admin.storage.from('dream-images').getPublicUrl(path);
  return data.publicUrl;
}

function extractImageUrl(output: unknown): string {
  if (typeof output === 'string' && (output.startsWith('http') || output.startsWith('https'))) return output;
  if (Array.isArray(output) && output[0]) {
    const first = output[0];
    if (typeof first === 'string') return first;
    const obj = first as { url?: string | (() => URL) };
    if (typeof obj?.url === 'string') return obj.url;
    if (typeof obj?.url === 'function') return obj.url().toString();
  }
  const o = output as { url?: string | (() => URL) };
  if (o?.url) return typeof o.url === 'string' ? o.url : o.url().toString();
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) return res.status(500).json({ error: 'Server config error' });
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const body = req.body as { dreamText: string; artistId: string; language?: string };
  const { dreamText, artistId, language = 'tr' } = body;
  if (!dreamText?.trim() || !artistId) {
    return res.status(400).json({ error: 'dreamText and artistId required' });
  }

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin.from('profiles').select('credits, is_banned').eq('id', user.id).single();
  if (!profile) return res.status(403).json({ error: 'Profile not found' });
  if (profile.is_banned) return res.status(403).json({ error: 'Account suspended' });
  if (profile.credits < 1) return res.status(402).json({ error: 'Insufficient credits' });

  const { data: artist } = await admin.from('artists').select('id, name, style_description').eq('id', artistId).eq('is_active', true).single();
  if (!artist) return res.status(400).json({ error: 'Invalid artist' });

  // Load Replicate model config from DB (admin-editable). Fallback to defaults if table missing/empty.
  let imageConfig: ReplicateModelRow = { key: 'image_generation', model_identifier: DEFAULT_IMAGE_MODEL, input_preset: 'imagen' };
  let interpretationConfig: ReplicateModelRow = { key: 'interpretation', model_identifier: DEFAULT_INTERPRETATION_MODEL, input_preset: 'llm' };
  try {
    const { data: rows } = await admin.from('replicate_models').select('key, model_identifier, input_preset, input_extra').in('key', ['image_generation', 'interpretation']);
    if (rows?.length) {
      const img = rows.find((r) => r.key === 'image_generation');
      if (img) imageConfig = img as ReplicateModelRow;
      const interp = rows.find((r) => r.key === 'interpretation');
      if (interp) interpretationConfig = interp as ReplicateModelRow;
    }
  } catch {
    // Table may not exist yet; use defaults
  }

  const imagePrompt = `Create a masterpiece painting of the following scene in the style of ${artist.name}. Style description: ${artist.style_description}. The scene is based on this dream: "${dreamText.trim()}". Make it atmospheric, artistic, and evocative.`;

  let imageUrl: string;
  try {
    const input = buildImageInput(imageConfig.input_preset, imagePrompt, imageConfig.input_extra);
    const output = await replicate.run(imageConfig.model_identifier as `${string}/${string}`, { input });
    const replicateUrl = extractImageUrl(output);
    if (!replicateUrl) throw new Error('No image URL from Replicate');
    imageUrl = await persistImageToStorage(admin, replicateUrl);
  } catch (e) {
    console.error('Replicate/image error:', e);
    return res.status(500).json({ error: 'Image generation failed' });
  }

  const langMap: Record<string, string> = { tr: 'Turkish', en: 'English', es: 'Spanish', de: 'German' };
  const langName = langMap[language] || 'Turkish';
  const interpretPrompt = `Act as a dream interpretation expert and a mystical sage. Interpret the following dream for the user. Tone: Gentle, mysterious, and insightful. Dream: "${dreamText.trim()}". IMPORTANT: Provide the response in ${langName} language. Keep the response under 3 short paragraphs.`;

  let interpretation: string;
  try {
    const input = buildInterpretationInput(interpretationConfig.input_preset, interpretPrompt);
    const claudeOut = await replicate.run(interpretationConfig.model_identifier as `${string}/${string}`, { input });
    interpretation = Array.isArray(claudeOut) ? (claudeOut as string[]).join('') : String(claudeOut ?? '');
  } catch (e) {
    console.error('Replicate interpretation error:', e);
    interpretation = 'The stars are silent right now.';
  }

  const { data: dream, error: dreamErr } = await admin.from('dreams').insert({
    user_id: user.id,
    prompt: dreamText.trim(),
    artist_id: artistId,
    image_url: imageUrl,
    interpretation,
    moderation_status: 'approved',
  }).select('id, image_url, interpretation, created_at').single();

  if (dreamErr) {
    console.error('Dream insert error:', dreamErr);
    return res.status(500).json({ error: 'Failed to save dream' });
  }

  await admin.from('credit_transactions').insert({
    user_id: user.id,
    amount: -1,
    reason: 'dream_used',
    reference_id: dream.id,
  });
  await admin.from('profiles').update({ credits: profile.credits - 1, updated_at: new Date().toISOString() }).eq('id', user.id);

  return res.status(200).json({
    id: dream.id,
    imageUrl: dream.image_url,
    interpretation: dream.interpretation,
    artistName: artist.name,
    createdAt: dream.created_at,
  });
}
