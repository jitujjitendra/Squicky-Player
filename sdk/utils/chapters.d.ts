import type { SquickyChapter } from "../core/types";
export declare function normalizeChapters(chapters: SquickyChapter[]): SquickyChapter[];
export declare function chapterAtTime(chapters: SquickyChapter[], time: number): SquickyChapter | null;
export declare function adjacentChapter(chapters: SquickyChapter[], currentTime: number, direction: -1 | 1): SquickyChapter | null;
//# sourceMappingURL=chapters.d.ts.map