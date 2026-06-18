import type { SquickyTextTrack } from "../core/types";
export declare function convertSrtToVtt(input: string): string;
export declare function normalizeVtt(input: string): string;
export declare function subtitleFileToTrack(file: File, options?: Partial<Pick<SquickyTextTrack, "id" | "label" | "srclang" | "kind" | "default">>): Promise<{
    track: SquickyTextTrack;
    objectUrl: string;
}>;
//# sourceMappingURL=subtitles.d.ts.map