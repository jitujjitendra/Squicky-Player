import type { SquickyThumbnailTrack, ThumbnailCue } from "../core/types";
export declare function parseThumbnailTime(value: string): number;
export declare function parseThumbnailVtt(input: string, baseUrl: string): ThumbnailCue[];
export declare function loadThumbnailTrack(track: SquickyThumbnailTrack): Promise<ThumbnailCue[]>;
export declare function thumbnailAtTime(cues: ThumbnailCue[], time: number): ThumbnailCue | null;
//# sourceMappingURL=thumbnails.d.ts.map