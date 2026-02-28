import type { ProgressEvent } from "./indexer";

interface IndexingState {
    running: boolean;
    events: ProgressEvent[];
    lastEvent: ProgressEvent | null;
    startedAt: number;
}

const globalState = globalThis as unknown as {
    __zencode_indexingState?: IndexingState;
};

function getState(): IndexingState {
    if (!globalState.__zencode_indexingState) {
        globalState.__zencode_indexingState = {
            running: false,
            events: [],
            lastEvent: null,
            startedAt: 0,
        };
    }
    return globalState.__zencode_indexingState;
}

export function isIndexing(): boolean {
    return getState().running;
}

export function getLastEvent(): ProgressEvent | null {
    return getState().lastEvent;
}

/**
 * Consume all events since last read. Returns them in order.
 */
export function drainEvents(): ProgressEvent[] {
    const state = getState();
    const events = state.events.splice(0);
    return events;
}

export function pushEvent(event: ProgressEvent): void {
    const state = getState();
    state.events.push(event);
    state.lastEvent = event;
}

export function markStarted(): void {
    const state = getState();
    state.running = true;
    state.events = [];
    state.lastEvent = null;
    state.startedAt = Date.now();
}

export function markFinished(): void {
    const state = getState();
    state.running = false;
}
