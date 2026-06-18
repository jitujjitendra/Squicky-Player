import type { AdapterContext, AudioTrackInfo, PlaybackAdapter, QualityLevel, SquickySource } from "../types";
export declare class DashAdapter implements PlaybackAdapter {
    readonly kind: "dash";
    private player;
    private context;
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
//# sourceMappingURL=DashAdapter.d.ts.map