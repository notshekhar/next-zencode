/**
 * Frontend Event Bus — enables extensions to send events to the UI.
 *
 * Extensions emit events via mom, which are streamed to the frontend
 * through the chat API. The frontend listens and reacts (play sounds,
 * show toasts, trigger animations, etc.).
 *
 * Architecture:
 *   Extension → mom.frontendEventBus.emit(...) → SSE/stream → Frontend listener
 */

// ─── Event Types ─────────────────────────────────────────────────────────────

export interface PlaySoundEvent {
    type: "play_sound";
    sound: "success" | "error" | "notification" | "complete" | string;
    volume?: number;
}

export interface ShowToastEvent {
    type: "show_toast";
    message: string;
    variant?: "default" | "success" | "error" | "warning" | "info";
    duration?: number;
}

export interface ShowNotificationEvent {
    type: "show_notification";
    title: string;
    body?: string;
    icon?: string;
}

export interface UpdateBadgeEvent {
    type: "update_badge";
    key: string;
    text: string | null;
    variant?: "default" | "success" | "error" | "warning";
}

export interface TriggerAnimationEvent {
    type: "trigger_animation";
    animation: "confetti" | "shake" | "pulse" | "bounce" | string;
    target?: string;
}

export interface CustomFrontendEvent {
    type: "custom";
    name: string;
    data?: unknown;
}

export type FrontendEvent =
    | PlaySoundEvent
    | ShowToastEvent
    | ShowNotificationEvent
    | UpdateBadgeEvent
    | TriggerAnimationEvent
    | CustomFrontendEvent;

export type FrontendEventType = FrontendEvent["type"];

export type FrontendEventHandler = (event: FrontendEvent) => void;

// ─── Event Bus ───────────────────────────────────────────────────────────────

class FrontendEventBus {
    private listeners: Set<FrontendEventHandler> = new Set();
    private pendingEvents: FrontendEvent[] = [];

    /**
     * Emit an event to all listeners. If no listeners are connected,
     * the event is queued and delivered when a listener subscribes.
     */
    emit(event: FrontendEvent): void {
        if (this.listeners.size === 0) {
            this.pendingEvents.push(event);
            return;
        }
        for (const handler of this.listeners) {
            try {
                handler(event);
            } catch (err) {
                console.error(
                    "[frontend-events] Handler error:",
                    err instanceof Error ? err.message : err,
                );
            }
        }
    }

    /**
     * Subscribe to frontend events. Returns an unsubscribe function.
     * Flushes any pending events immediately on subscribe.
     */
    subscribe(handler: FrontendEventHandler): () => void {
        this.listeners.add(handler);

        // Flush pending events
        if (this.pendingEvents.length > 0) {
            const pending = [...this.pendingEvents];
            this.pendingEvents = [];
            for (const event of pending) {
                try {
                    handler(event);
                } catch {
                    // ignore
                }
            }
        }

        return () => {
            this.listeners.delete(handler);
        };
    }

    /**
     * Drain all pending events (useful for SSE flush).
     */
    drain(): FrontendEvent[] {
        const events = [...this.pendingEvents];
        this.pendingEvents = [];
        return events;
    }

    /**
     * Number of active listeners.
     */
    get listenerCount(): number {
        return this.listeners.size;
    }
}

/** Singleton frontend event bus */
export const frontendEventBus = new FrontendEventBus();
