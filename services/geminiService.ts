import { Type } from "@google/genai";
import { SubtitleEntry, TranslatedSubtitleEntry, BatchTranslationInput, BatchTranslationOutput } from '../types';
import { calculateDuration } from "../utils/subtitleManager";

const BATCH_SIZE = 25; // Process 25 subtitles at a time
const MAX_RETRIES = 3; // Maximum retry attempts per batch
const RETRY_DELAY_MS = 2000; // Base delay between retries (doubles each retry)
const MISSING_MARKER = '__MISSING__'; // Internal marker for untranslated entries

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs a basic, synchronous, client-side format check for a Gemini API key.
 */
export const validateApiKey = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  return apiKey.trim().length > 0 && apiKey.startsWith('AIza');
};

const getSystemInstruction = (synopsis: string, characters: string, sourceLanguage: string, targetLanguage: string) => `
You are an expert subtitle translator with a deep understanding of literature, cinema, and storytelling. Your task is to translate subtitles from ${sourceLanguage} into ${targetLanguage}.

**Crucial Constraints:**
1.  **Preserve Meaning & Nuance:** Do not perform a literal translation. Capture the original intent, emotion, subtext, and cultural nuances. The translation must sound natural and fluent in ${targetLanguage}.
2.  **Respect Time Constraints:** For each subtitle entry, a "duration_seconds" is provided. This is the time the subtitle is on screen. Your translated text must be concise and easily readable within this duration.
3.  **Maintain Consistency:** Use the provided story context and character list to ensure consistency in tone, terminology, and character voices.
4.  **Pay Attention to Gender and Formality:** Accurately reflect character genders in the translation. Use appropriate levels of politeness, formality, and honorifics based on the characters' relationships and the cultural context of the ${targetLanguage} language.
5.  **NEVER skip any entry:** You MUST translate every single subtitle entry provided. Every input entry MUST have a corresponding output entry with the same ID.

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

// ============================================================
// Core API call helper - handles a single API request with retry
// ============================================================
const callGeminiAPI = async (
  apiKey: string,
  entries: SubtitleEntry[],
  synopsis: string,
  characters: string,
  sourceLanguage: string,
  targetLanguage: string,
  label: string  // For logging, e.g. "Batch 3/22" or "Retry missing 5 entries"
): Promise<BatchTranslationOutput[]> => {

  const batchInput: BatchTranslationInput[] = entries.map(sub => ({
    id: sub.id,
    original_text: sub.text,
    duration_seconds: calculateDuration(sub.startTime, sub.endTime)
  }));

  const prompt = `Translate the following ${entries.length} subtitle entries. You MUST return EXACTLY ${entries.length} translated entries in the JSON array, one for each input entry. Every input ID must appear in the output. Do not skip any entries.\n\n${JSON.stringify(batchInput, null, 2)}`;

  const modelName = 'gemini-3-flash-preview';
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: getSystemInstruction(synopsis, characters, sourceLanguage, targetLanguage) }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${label}] Attempt ${attempt}/${MAX_RETRIES} - Translating ${entries.length} entries (IDs: ${entries.map(e => e.id).join(', ')})`);

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${res.status}: API error`;
        throw new Error(message);
      }

      const responseData = await res.json();

      // Check for blocked or empty responses
      const finishReason = responseData?.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        throw new Error(`API response blocked: ${finishReason}`);
      }

      const jsonStr = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) {
        throw new Error('No text content in API response');
      }

      let parsed: BatchTranslationOutput[];
      try {
        parsed = JSON.parse(jsonStr) as BatchTranslationOutput[];
      } catch (parseError) {
        throw new Error(`JSON parse failed: ${(parseError as Error).message}`);
      }

      if (!Array.isArray(parsed)) {
        throw new Error('API response is not an array');
      }

      return parsed;

    } catch (error) {
      lastError = error as Error;
      console.error(`[${label}] Attempt ${attempt} failed:`, (error as Error).message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[${label}] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`All ${MAX_RETRIES} attempts failed for ${label}`);
};

// ============================================================
// Main translation function - guarantees 100% completion
// ============================================================
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

  // translationMap: id -> translatedText (single source of truth)
  const translationMap = new Map<number, string>();
  const totalSubtitles = subtitles.length;
  const totalBatches = Math.ceil(totalSubtitles / BATCH_SIZE);

  // ===========================================
  // Phase 1: Process all batches
  // ===========================================
  for (let i = 0; i < totalSubtitles; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const batch = subtitles.slice(i, i + BATCH_SIZE);

    try {
      const results = await callGeminiAPI(
        apiKey, batch, synopsis, characters,
        sourceLanguage, targetLanguage,
        `Batch ${batchIndex}/${totalBatches}`
      );

      // Store successful translations
      for (const result of results) {
        if (result.id != null && result.translation) {
          translationMap.set(result.id, result.translation);
        }
      }

      // Log completeness for this batch
      const batchIds = new Set(batch.map(b => b.id));
      const translatedIds = new Set(results.filter(r => r.id != null).map(r => r.id));
      const missingInBatch = [...batchIds].filter(id => !translatedIds.has(id));
      if (missingInBatch.length > 0) {
        console.warn(`[Batch ${batchIndex}] Missing ${missingInBatch.length} entries: IDs ${missingInBatch.join(', ')}`);
      }

    } catch (error) {
      console.error(`[Batch ${batchIndex}] Failed after all retries:`, (error as Error).message);
      // Don't throw yet — we'll try to recover missing entries in Phase 2
    }

    onProgress(Math.min(i + BATCH_SIZE, totalSubtitles), totalSubtitles);
  }

  // ===========================================
  // Phase 2: Identify and retry missing entries
  // ===========================================
  let missingEntries = subtitles.filter(sub => !translationMap.has(sub.id));

  if (missingEntries.length > 0) {
    console.log(`\n===== Phase 2: Retrying ${missingEntries.length} missing entries =====`);

    // Try in smaller batches first (10 at a time)
    const SMALL_BATCH_SIZE = 10;
    for (let i = 0; i < missingEntries.length; i += SMALL_BATCH_SIZE) {
      const smallBatch = missingEntries.slice(i, i + SMALL_BATCH_SIZE);
      const batchNum = Math.floor(i / SMALL_BATCH_SIZE) + 1;
      const totalSmallBatches = Math.ceil(missingEntries.length / SMALL_BATCH_SIZE);

      try {
        const results = await callGeminiAPI(
          apiKey, smallBatch, synopsis, characters,
          sourceLanguage, targetLanguage,
          `Recovery batch ${batchNum}/${totalSmallBatches} (${smallBatch.length} entries)`
        );

        for (const result of results) {
          if (result.id != null && result.translation) {
            translationMap.set(result.id, result.translation);
          }
        }
      } catch (error) {
        console.error(`[Recovery batch ${batchNum}] Failed:`, (error as Error).message);
      }
    }
  }

  // ===========================================
  // Phase 3: Individual retry for any remaining
  // ===========================================
  missingEntries = subtitles.filter(sub => !translationMap.has(sub.id));

  if (missingEntries.length > 0) {
    console.log(`\n===== Phase 3: Individual retry for ${missingEntries.length} remaining entries =====`);

    for (const entry of missingEntries) {
      try {
        const results = await callGeminiAPI(
          apiKey, [entry], synopsis, characters,
          sourceLanguage, targetLanguage,
          `Individual entry ID ${entry.id}`
        );

        if (results.length > 0 && results[0].translation) {
          translationMap.set(entry.id, results[0].translation);
        }
      } catch (error) {
        console.error(`[Individual ID ${entry.id}] Failed:`, (error as Error).message);
      }
    }
  }

  // ===========================================
  // Phase 4: Final verification & assembly
  // ===========================================
  const finalMissing = subtitles.filter(sub => !translationMap.has(sub.id));
  const translatedCount = translationMap.size;

  console.log(`\n===== Translation Complete: ${translatedCount}/${totalSubtitles} entries translated =====`);

  if (finalMissing.length > 0) {
    console.error(`Failed to translate ${finalMissing.length} entries: IDs ${finalMissing.map(e => e.id).join(', ')}`);

    // Build the result with markers for missing translations
    const allEntries: TranslatedSubtitleEntry[] = subtitles.map(sub => ({
      ...sub,
      translatedText: translationMap.get(sub.id) || `[翻譯失敗 - ID ${sub.id}]`
    }));

    // Throw with partial results attached so the UI can still show them
    const progressError = new Error(
      `翻譯未完全完成：${translatedCount}/${totalSubtitles} 條已翻譯，` +
      `${finalMissing.length} 條失敗（IDs: ${finalMissing.map(e => e.id).join(', ')}）。\n` +
      `已翻譯的部分已保留，您可以下載後手動補完，或重新嘗試。`
    );
    (progressError as any).partialResults = allEntries;
    (progressError as any).completedCount = translatedCount;
    (progressError as any).totalCount = totalSubtitles;

    throw progressError;
  }

  // 100% success — assemble final result
  const allEntries: TranslatedSubtitleEntry[] = subtitles.map(sub => ({
    ...sub,
    translatedText: translationMap.get(sub.id)!
  }));

  return allEntries.sort((a, b) => a.id - b.id);
};