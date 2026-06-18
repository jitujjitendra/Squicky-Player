import type { AdapterContext, PlaybackAdapter, SquickySource } from "./types";
export declare class SourceController {
    private adapter;
    get current(): PlaybackAdapter | null;
    load(source: SquickySource, media: HTMLMediaElement, context: AdapterContext): Promise<PlaybackAdapter>;
    destroy(): void;
}
//# sourceMappingURL=SourceController.d.ts.map