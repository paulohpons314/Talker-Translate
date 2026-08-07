export type Language = 'en' | 'pt' | 'auto';

export type TranslationStyle = 'fluid' | 'formal' | 'literal' | 'creative';

export interface KeyTerm {
  term: string;
  translation: string;
  explanation?: string;
}

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage: Language;
  keyTerms?: KeyTerm[];
  formattedMarkdown?: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  base64?: string;
  url?: string;
}

export interface Quote {
  id: number;
  quote: string;
  author: string;
  sourceLang?: 'pt' | 'en';
}

export interface GeminiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
