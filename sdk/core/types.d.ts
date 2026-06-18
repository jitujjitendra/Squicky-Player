export type MediaKind = "video" | "audio";
export type StreamKind = "native" | "hls" | "dash";
export type PlayerStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "buffering" | "ended" | "error";
export interface SquickyTextTrack {
    id?: string;
    src: string;
    label: string;
    srclang: string;
    kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
    default?: boolean;
}
export interface TextTrackInfo {
    id: string;
    label: string;
    language: string;
    kind: TextTrackKind;
    mode: TextTrackMode;
}
export interface SquickyChapter {
    id?: string;
    title: string;
    start: number;
    end?: number;
    thumbnail?: string;
}
export interface SquickyThumbnailTrack {
    src: string;
    label?: string;
}
export interface ThumbnailCue {
    start: number;
    end: number;
    src: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
export interface SquickySource {
    src: string;
    type?: string;
    kind?: MediaKind;
    title?: string;
    poster?: string;
    id?: string;
    tracks?: SquickyTextTrack[];
    chapters?: SquickyChapter[];
    thumbnails?: SquickyThumbnailTrack;
    metadata?: Record<string, unknown>;
}
export interface QualityLevel {
    id: string;
    label: string;
    height?: number;
    width?: number;
    bitrate?: number;
    auto?: boolean;
}
export interface AudioTrackInfo {
    id: string;
    label: string;
    language: string;
    kind?: string;
    codec?: string;
    channels?: string;
    default?: boolean;
    selected: boolean;
}
export type SquickyRemotePlaybackState = "unavailable" | "disconnected" | "connecting" | "connected";
export interface PlayerCapabilities {
    fullscreen: boolean;
    pictureInPicture: boolean;
    mediaSource: boolean;
    encryptedMedia: boolean;
    remotePlayback: boolean;
    airPlay: boolean;
    webAudio: boolean;
    nativeHls: boolean;
    codecs: Record<string, CanPlayTypeResult>;
}
export interface PlayerSnapshot {
    status: PlayerStatus;
    currentTime: number;
    duration: number;
    buffered: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
    source: SquickySource | null;
    streamKind: StreamKind | null;
    qualities: QualityLevel[];
    selectedQuality: string;
    audioTracks: AudioTrackInfo[];
    selectedAudioTrack: string;
    textTracks: TextTrackInfo[];
    selectedTextTrack: string;
    chapters: SquickyChapter[];
    activeChapter: SquickyChapter | null;
    thumbnails: ThumbnailCue[];
    remotePlaybackAvailable: boolean;
    remotePlaybackState: SquickyRemotePlaybackState;
}
export type SquickyErrorCode = "ABORTED" | "NETWORK" | "DECODE" | "SOURCE_NOT_SUPPORTED" | "STREAM_ENGINE" | "THUMBNAIL_TRACK" | "REMOTE_PLAYBACK" | "INVALID_SOURCE" | "UNKNOWN";
export interface SquickyError {
    code: SquickyErrorCode;
    message: string;
    fatal: boolean;
    cause?: unknown;
    source?: SquickySource;
}
export interface PlayerEventMap {
    ready: PlayerSnapshot;
    statechange: PlayerSnapshot;
    sourcechange: SquickySource;
    play: PlayerSnapshot;
    pause: PlayerSnapshot;
    ended: PlayerSnapshot;
    timeupdate: PlayerSnapshot;
    volumechange: PlayerSnapshot;
    ratechange: PlayerSnapshot;
    qualitieschange: QualityLevel[];
    qualitychange: QualityLevel | null;
    audiotrackschange: AudioTrackInfo[];
    audiotrackchange: AudioTrackInfo | null;
    texttrackschange: TextTrackInfo[];
    texttrackchange: TextTrackInfo | null;
    chapterschange: SquickyChapter[];
    chapterchange: SquickyChapter | null;
    thumbnailschange: ThumbnailCue[];
    remoteplaybackchange: SquickyRemotePlaybackState;
    error: SquickyError;
    destroy: undefined;
}
export type PlayerEventName = keyof PlayerEventMap;
export type PlayerEventHandler<K extends PlayerEventName> = (payload: PlayerEventMap[K]) => void;
export interface SquickyPluginContext {
    player: SquickyPlayerApi;
    media: HTMLMediaElement;
}
export interface SquickyPlugin {
    name: string;
    setup(context: SquickyPluginContext): void | Promise<void>;
    destroy?(): void | Promise<void>;
}
export interface SquickyPlayerOptions {
    media: HTMLMediaElement;
    source?: SquickySource;
    autoplay?: boolean;
    muted?: boolean;
    volume?: number;
    playbackRate?: number;
    plugins?: SquickyPlugin[];
}
export interface SquickyPlayerApi {
    readonly media: HTMLMediaElement;
    readonly capabilities: PlayerCapabilities;
    readonly snapshot: PlayerSnapshot;
    load(source: SquickySource): Promise<void>;
    play(): Promise<void>;
    pause(): void;
    toggle(): Promise<void>;
    seek(time: number): void;
    seekBy(seconds: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackRate(rate: number): void;
    setQuality(id: string): void;
    setAudioTrack(id: string): void;
    addTextTrack(track: SquickyTextTrack): void;
    setTextTrack(id: string): void;
    seekToChapter(id: string): void;
    previousChapter(): void;
    nextChapter(): void;
    requestFullscreen(): Promise<void>;
    requestPictureInPicture(): Promise<void>;
    requestRemotePlayback(): Promise<void>;
    requestAirPlay(): void;
    on<K extends PlayerEventName>(event: K, handler: PlayerEventHandler<K>): () => void;
    destroy(): Promise<void>;
}
export interface AdapterContext {
    onError(error: SquickyError): void;
    onQualities(levels: QualityLevel[], selectedId: string): void;
    onAudioTracks(tracks: AudioTrackInfo[], selectedId: string): void;
}
export interface PlaybackAdapter {
    readonly kind: StreamKind;
    load(source: SquickySource, media: HTMLMediaElement, context: AdapterContext): Promise<void>;
    getQualities(): QualityLevel[];
    getSelectedQuality(): string;
    setQuality(id: string): void;
    getAudioTracks(): AudioTrackInfo[];
    getSelectedAudioTrack(): string;
    setAudioTrack(id: string): void;
    destroy(): void;
}
//# sourceMappingURL=types.d.ts.map