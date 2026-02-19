export interface Artist {
  id: string;
  name: string;
  styleDescription: string;
  imageUrl: string; // Avatar URL
}

export interface DreamResult {
  imageUrl: string | null;
  interpretation: string | null;
}

export enum LoadingState {
  IDLE = 'IDLE',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  INTERPRETING = 'INTERPRETING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type SubscriptionTier = 'FREE' | 'PRO';

export interface DreamRecord {
  id: string;
  date: string; // ISO String
  prompt: string;
  imageUrl: string;
  interpretation: string;
  artistName: string;
}

export type Language = 'tr' | 'en' | 'es' | 'de';

export interface UserProfile {
  credits: number;
  tier: SubscriptionTier;
  dreamsGenerated: number;
  history: DreamRecord[];
  language: Language;
}

export interface Plan {
  id: string;
  title: string;
  price: string;
  period?: string;
  features: string[];
  recommended?: boolean;
}