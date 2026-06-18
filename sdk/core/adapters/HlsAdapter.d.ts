import type { AdapterContext, AudioTrackInfo, PlaybackAdapter, QualityLevel, SquickySource } from "../types";
export declare class HlsAdapter implements PlaybackAdapter {
    readonly kind: "hls";
    private hls;
    private media;
    private context;
    private nativeAudioTracks;
    load(source: SquickySource, media: HTMLMediaElement, context: AdapterContext): Promise<void>;
    getQualities(): QualityLevel[];
    getSelectedQuality(): string;
    setQuality(id: string): void;
    getAudioTracks(): AudioTrackInfo[];
    getSelectedAudioTrack(): string;
    setAudioTrack(id: string): void;
    destroy(): void;
    private publishQualities;
    private publishAudioTracks;
}
//# sourceMappingURL=HlsAdapter.d.ts.map