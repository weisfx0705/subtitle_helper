import { Type } from "@google/genai";
import { SubtitleEntry, TranslatedSubtitleEntry, BatchTranslationInput, BatchTranslationOutput } from '../types';
import { calculateDuration } from "../utils/subtitleManager";

const BATCH_SIZE = 25; // Process 25 subtitles at a time

/**
 * Performs a basic, synchronous, client-side format check for a Gemini API key.
 * This avoids making a network request that could be affected by environment/fallback keys.
 * The real validation occurs when an actual translation call is made.
 * @param apiKey The API key to validate.
 * @returns True if the key has a plausible format, false otherwise.
 */
export const validateApiKey = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  // A basic format check. Google AI API keys are non-empty and typically start with "AIza".
  // This is not a guarantee of validity but catches common input errors.
  return apiKey.trim().length > 0 && apiKey.startsWith('AIza');
};

const getSystemInstruction = (synopsis: string, characters: string, sourceLanguage: string, targetLanguage: string) => `
You are an expert subtitle translator with a deep understanding of literature, cinema, and storytelling. Your task is to translate subtitles from ${sourceLanguage} into ${targetLanguage}.

**Crucial Constraints:**
1.  **Preserve Meaning & Nuance:** Do not perform a literal translation. Capture the original intent, emotion, subtext, and cultural nuances. The translation must sound natural and fluent in ${targetLanguage}.
2.  **Respect Time Constraints:** For each subtitle entry, a "duration_seconds" is provided. This is the time the subtitle is on screen. Your translated text must be concise and easily readable within this duration.
3.  **Maintain Consistency:** Use the provided story context and character list to ensure consistency in tone, terminology, and character voices.
4.  **Pay Attention to Gender and Formality:** Accurately reflect character genders in the translation. Use appropriate levels of politeness, formality, and honorifics based on the characters' relationships and the cultural context of the ${targetLanguage} language.

**Provided Context:**
*   **Story Synopsis:** ${synopsis}
*   **Character List:** ${characters}
`;

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.NUMBER,
        description: 'The original ID of the subtitle entry.'
      },
      translation: {
        type: Type.STRING,
        description: 'The translated subtitle text, crafted for the target language and time duration.'
      },
    },
    required: ["id", "translation"],
  },
};

export const translateSubtitlesBatch = async (
  apiKey: string,
  subtitles: SubtitleEntry[],
  synopsis: string,
  characters: string,
  sourceLanguage: string,
  targetLanguage: string,
  model: string,
  onProgress: (processed: number, total: number) => void
): Promise<TranslatedSubtitleEntry[]> => {
  if (!apiKey) {
    throw new Error("API key is not provided.");
  }

  const allTranslatedEntries: TranslatedSubtitleEntry[] = [];
  const totalSubtitles = subtitles.length;

  for (let i = 0; i < totalSubtitles; i += BATCH_SIZE) {
    const batch = subtitles.slice(i, i + BATCH_SIZE);

    const batchInput: BatchTranslationInput[] = batch.map(sub => ({
      id: sub.id,
      original_text: sub.text,
      duration_seconds: calculateDuration(sub.startTime, sub.endTime)
    }));

    const prompt = `Translate the following subtitle entries. Respond with a JSON array where each object corresponds to an entry in the input array.\n\n${JSON.stringify(batchInput, null, 2)}`;

    const modelName = 'gemini-3-flash-preview';
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const generationConfig: any = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    };

    // Removed legacy 'gemini-2.5-flash-fastest' check as we are using gemini-3-flash-preview

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: getSystemInstruction(synopsis, characters, sourceLanguage, targetLanguage) }]
      },
      generationConfig: generationConfig,
    };

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const message = errorData?.error?.message || 'An unknown API error occurred.';
        throw new Error(message);
      }

      const responseData = await res.json();

      const jsonStr = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) {
        throw new Error('Invalid response structure from API.');
      }

      const translatedBatch = JSON.parse(jsonStr) as BatchTranslationOutput[];

      const mergedBatch = batch.map(original => {
        const translated = translatedBatch.find(t => t.id === original.id);
        return {
          ...original,
          translatedText: translated ? translated.translation : `!!TRANSLATION FAILED for id ${original.id}!!`
        };
      });

      allTranslatedEntries.push(...mergedBatch);

    } catch (error) {
      console.error("Error translating batch:", error);
      // Rethrow the error to stop the entire translation process.
      // The UI will handle displaying the specific error.
      throw error;
    }

    onProgress(Math.min(i + BATCH_SIZE, totalSubtitles), totalSubtitles);
  }

  // Ensure the final array is sorted by ID
  return allTranslatedEntries.sort((a, b) => a.id - b.id);
};