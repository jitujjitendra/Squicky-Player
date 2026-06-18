import type { MediaKind, SquickySource, StreamKind } from "../core/types";
export declare function getExtension(value: string): string;
export declare function detectStreamKind(source: SquickySource): StreamKind;
export declare function detectMediaKind(source: SquickySource): MediaKind;
export declare function inferMimeType(source: SquickySource): string;
export declare function sourceStorageKey(source: SquickySource): string;
//# sourceMappingURL=source.d.ts.map