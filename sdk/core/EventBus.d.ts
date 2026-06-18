import type { PlayerEventHandler, PlayerEventMap, PlayerEventName } from "./types";
export declare class EventBus {
    private readonly listeners;
    on<K extends PlayerEventName>(event: K, handler: PlayerEventHandler<K>): () => void;
    emit<K extends PlayerEventName>(event: K, payload: PlayerEventMap[K]): void;
    clear(): void;
}
//# sourceMappingURL=EventBus.d.ts.map