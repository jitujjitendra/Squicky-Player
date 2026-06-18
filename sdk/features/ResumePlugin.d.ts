import type { SquickyPlugin, SquickyPluginContext, SquickySource } from "../core/types";
export interface ResumePluginOptions {
    storage?: Storage;
    saveInterval?: number;
    minimumPosition?: number;
    completionWindow?: number;
    requestResume?: (position: number, source: SquickySource, duration: number) => boolean | Promise<boolean>;
}
export declare class ResumePlugin implements SquickyPlugin {
    readonly name = "resume";
    private player;
    private storage;
    private saveInterval;
    private minimumPosition;
    private completionWindow;
    private requestResume?;
    private lastSavedAt;
    private disposers;
    constructor(options?: ResumePluginOptions);
    setup({ player }: SquickyPluginContext): void;
    destroy(): void;
    private restore;
    private maybeSave;
    private save;
    private clear;
    private getDefaultStorage;
}
//# sourceMappingURL=ResumePlugin.d.ts.map