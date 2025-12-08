
import { SubtitleEntry, TranslatedSubtitleEntry } from '../types';

const timecodeToSeconds = (timecode: string): number => {
    const parts = timecode.split(/[:,]/);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const milliseconds = parseInt(parts[3], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

export const calculateDuration = (startTime: string, endTime: string): number => {
    return timecodeToSeconds(endTime) - timecodeToSeconds(startTime);
};

export const parseSRT = (content: string): SubtitleEntry[] => {
    const entries: SubtitleEntry[] = [];
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const id = parseInt(lines[0], 10);
            const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
            
            if (id && timeMatch) {
                const startTime = timeMatch[1];
                const endTime = timeMatch[2];
                const text = lines.slice(2).join('\n');

                entries.push({ id, startTime, endTime, text });
            }
        }
    }
    return entries;
};

export const formatSRT = (entries: TranslatedSubtitleEntry[]): string => {
    return entries
        .map(entry => {
            return `${entry.id}\n${entry.startTime} --> ${entry.endTime}\n${entry.translatedText}`;
        })
        .join('\n\n');
};
