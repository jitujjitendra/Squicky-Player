import type { SquickyPlugin, SquickyPluginContext } from "../core/types";
export declare class MediaSessionPlugin implements SquickyPlugin {
    readonly name = "media-session";
    private context;
    private disposers;
    private lastPositionUpdate;
    setup(context: SquickyPluginContext): void;
    destroy(): void;
    private updateMetadata;
    private updatePosition;
    private setPlaybackState;
    private setAction;
}
//# sourceMappingURL=MediaSessionPlugin.d.ts.map