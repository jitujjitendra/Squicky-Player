import type { AdapterContext, AudioTrackInfo, PlaybackAdapter, QualityLevel, SquickySource } from "../types";
export declare class NativeAdapter implements PlaybackAdapter {
    readonly kind: "native";
    private media;
    private context;
    private audioTracks;
    load(source: SquickySource, media: HTMLMediaElement, context: AdapterContext): Promise<void>;
    getQualities(): QualityLevel[];
    getSelectedQuality(): string;
    setQuality(_id: string): void;
    getAudioTracks(): AudioTrackInfo[];
    getSelectedAudioTrack(): string;
    setAudioTrack(id: string): void;
    destroy(): void;
    private readonly publishAudioTracks;
}
//# sourceMappingURL=NativeAdapter.d.ts.map