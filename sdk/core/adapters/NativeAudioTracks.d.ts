import type { AudioTrackInfo } from "../types";
export declare class NativeAudioTracks {
    private readonly onChange;
    private readonly list;
    constructor(media: HTMLMediaElement, onChange: () => void);
    getTracks(): AudioTrackInfo[];
    getSelectedId(): string;
    select(id: string): void;
    destroy(): void;
}
//# sourceMappingURL=NativeAudioTracks.d.ts.map