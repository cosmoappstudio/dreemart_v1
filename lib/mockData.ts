import type { DreamRecord } from '../types';
import type { Profile } from '../context/AuthContext';

export const DEMO_STORAGE_KEY = 'dreamink_demo';

export const MOCK_DEMO_PROFILE: Profile = {
  id: 'demo-user',
  email: 'demo@dreamink.app',
  full_name: 'Demo Kullanıcı',
  avatar_url: null,
  language: 'tr',
  credits: 5,
  tier: 'free',
  role: 'user',
  is_banned: false,
};

export const MOCK_DREAMS: DreamRecord[] = [
  {
    id: 'mock-1',
    date: new Date(Date.now() - 86400000).toISOString(),
    prompt: 'Sonsuz bir merdivenden çıkıyordum, gökyüzü mor ve turuncu renklerle doluydu.',
    imageUrl: 'https://picsum.photos/seed/dream1/400/500',
    interpretation: 'Merdiven rüyaları genellikle ilerleme ve yükselme arzusunu simgeler. Mor ve turuncu gökyüzü, değişim ve yaratıcı enerjiyle ilişkilendirilir. Bu rüya, hayatında yeni bir aşamaya geçmeye hazır olduğunu ve sezgilerine güvenmen gerektiğini işaret edebilir.',
    artistName: 'Van Gogh',
  },
  {
    id: 'mock-2',
    date: new Date(Date.now() - 172800000).toISOString(),
    prompt: 'Bir ormanda kaybolmuştum, ağaçlar konuşuyordu.',
    imageUrl: 'https://picsum.photos/seed/dream2/400/500',
    interpretation: 'Orman bilinçaltının karanlık ve keşfedilmemiş bölgelerini temsil eder. Konuşan ağaçlar, doğa ile bağlantı veya iç seslerin dışa vurumu olarak yorumlanabilir. Bu rüya, dinlenmeye ve içgüdülerine kulak vermeye ihtiyacın olduğunu hatırlatıyor olabilir.',
    artistName: 'Claude Monet',
  },
  {
    id: 'mock-3',
    date: new Date(Date.now() - 259200000).toISOString(),
    prompt: 'Uçuyordum, şehir ayaklarımın altında küçülüyordu.',
    imageUrl: 'https://picsum.photos/seed/dream3/400/500',
    interpretation: 'Uçma rüyaları özgürlük, sınırlardan kurtulma veya yüksek hedeflere ulaşma isteğiyle ilişkilidir. Şehrin küçülmesi, günlük kaygıların üzerinde bir perspektif kazandığını veya büyük resmi görmeye başladığını simgeleyebilir.',
    artistName: 'Salvador Dalí',
  },
];

/** Demo modda simüle edilmiş rüya yorumu metni */
export function getMockInterpretation(dreamText: string, _language: string): string {
  const snippets = [
    'Bu rüya, bilinçaltındaki bazı arzuların veya korkuların dışa vurumu olarak yorumlanabilir. Semboller genellikle kişisel deneyimlerle şekillenir.',
    'Rüya imgeleri bazen günlük yaşamdan izler taşır. Bu sahneler, iç dünyandaki denge arayışına işaret edebilir.',
    'Mistik geleneklerde benzer imgeler, dönüşüm ve yeniden doğuşla ilişkilendirilir. Kendine zaman ayırmak iyi gelebilir.',
  ];
  const i = Math.abs(dreamText.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % snippets.length;
  return snippets[i];
}
