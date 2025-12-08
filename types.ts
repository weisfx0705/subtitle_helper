
export enum AppState {
  Uploading,
  Context,
  Translating,
  Reviewing,
}

export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface TranslatedSubtitleEntry extends SubtitleEntry {
  translatedText: string;
}

export interface BatchTranslationInput {
  id: number;
  original_text: string;
  duration_seconds: number;
}

export interface BatchTranslationOutput {
  id: number;
  translation: string;
}

export interface TranslationContext {
  synopsis: string;
  characters: string;
  originalSourceLanguage: string; // Language of the uploaded file
  currentSourceLanguage: string;  // Language used as source for the current translation
  targetLanguage: string;
  model: string;
}
