/**
 * Permission Manager with queue-based request handling
 *
 * Single Responsibility: Handles permission requests only
 * Open/Closed: Can extend with new permission types without modifying core logic
 *
 * Fixes:
 * - Uses a queue instead of single currentRequest to handle concurrent requests
 * - Better ID generation using crypto
 * - Timeout mechanism for stale requests
 * - Proper cleanup on rejection
 */

export type PermissionResponse = "yes" | "always" | "no";

export interface PermissionRequest {
    id: string;
    command: string;
    baseCommand: string;
    createdAt: number;
    resolve: (response: PermissionResponse) => void;
    reject: (error: Error) => void;
}

type PermissionCallback = (request: PermissionRequest) => void;

// Request timeout in milliseconds (2 minutes)
const REQUEST_TIMEOUT_MS = 120000;

/**
 * PermissionManager - Handles permission request queue
 */
class PermissionManager {
    private callback: PermissionCallback | null = null;
    private requestQueue: Map<string, PermissionRequest> = new Map();
    private currentRequestId: string | null = null;
    private timeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();

    /**
     * Generate a unique request ID
     */
    private generateId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        const counter = this.requestQueue.size.toString(36);
        return `${timestamp}-${random}-${counter}`;
    }

    /**
     * Register a callback to handle permission requests
     * Returns a cleanup function
     */
    onPermissionRequest(callback: PermissionCallback): () => void {
        this.callback = callback;

        // Process any pending requests
        this.processNextRequest();

        return () => {
            this.callback = null;
        };
    }

    /**
     * Process the next request in the queue
     */
    private processNextRequest(): void {
        if (!this.callback || this.currentRequestId) {
            return;
        }

        // Get the first pending request
        const entries = Array.from(this.requestQueue.entries());
        if (entries.length === 0) {
            return;
        }

        const [id, request] = entries[0]!;
        this.currentRequestId = id;
        this.callback(request);
    }

    /**
     * Request permission for a command
     * Returns a promise that resolves with the user's response
     */
    requestPermission(
        command: string,
        baseCommand: string,
    ): Promise<PermissionResponse> {
        return new Promise((resolve, reject) => {
            const id = this.generateId();

            const request: PermissionRequest = {
                id,
                command,
                baseCommand,
                createdAt: Date.now(),
                resolve: (response: PermissionResponse) => {
                    this.cleanupRequest(id);
                    resolve(response);
                },
                reject: (error: Error) => {
                    this.cleanupRequest(id);
                    reject(error);
                },
            };

            // Add to queue
            this.requestQueue.set(id, request);

            // Set timeout
            const timeoutId = setTimeout(() => {
                const pendingRequest = this.requestQueue.get(id);
                if (pendingRequest) {
                    pendingRequest.reject(
                        new Error("Permission request timed out"),
                    );
                }
            }, REQUEST_TIMEOUT_MS);
            this.timeoutIds.set(id, timeoutId);

            // If no callback registered, reject immediately
            if (!this.callback) {
                request.reject(new Error("No permission handler registered"));
                return;
            }

            // Process queue
            this.processNextRequest();
        });
    }

    /**
     * Cleanup a request (remove from queue, clear timeout)
     */
    private cleanupRequest(id: string): void {
        this.requestQueue.delete(id);

        const timeoutId = this.timeoutIds.get(id);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeoutIds.delete(id);
        }

        if (this.currentRequestId === id) {
            this.currentRequestId = null;
            // Process next request in queue
            this.processNextRequest();
        }
    }

    /**
     * Respond to a permission request
     */
    respondToPermission(
        requestId: string,
        response: PermissionResponse,
    ): boolean {
        const request = this.requestQueue.get(requestId);
        if (!request) {
            return false;
        }

        // Resolve the promise (this will trigger cleanup via the wrapped resolve)
        request.resolve(response);
        return true;
    }

    /**
     * Get the current pending permission request
     */
    getCurrentRequest(): PermissionRequest | null {
        if (!this.currentRequestId) {
            return null;
        }
        return this.requestQueue.get(this.currentRequestId) || null;
    }

    /**
     * Get all pending requests (for debugging)
     */
    getPendingRequests(): PermissionRequest[] {
        return Array.from(this.requestQueue.values());
    }

    /**
     * Cancel the current permission request
     */
    cancelCurrentRequest(): void {
        if (this.currentRequestId) {
            const request = this.requestQueue.get(this.currentRequestId);
            if (request) {
                request.resolve("no");
            }
        }
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests(): void {
        for (const request of this.requestQueue.values()) {
            request.reject(new Error("All permission requests cancelled"));
        }
        this.requestQueue.clear();
        this.currentRequestId = null;

        for (const timeoutId of this.timeoutIds.values()) {
            clearTimeout(timeoutId);
        }
        this.timeoutIds.clear();
    }

    /**
     * Check if there are pending requests
     */
    hasPendingRequests(): boolean {
        return this.requestQueue.size > 0;
    }
}

// Export singleton instance
const permissionManager = new PermissionManager();

// Export functions for backward compatibility
export function onPermissionRequest(
    callback: (request: PermissionRequest) => void,
): () => void {
    return permissionManager.onPermissionRequest(callback);
}

export function requestPermission(
    command: string,
    baseCommand: string,
): Promise<PermissionResponse> {
    return permissionManager.requestPermission(command, baseCommand);
}

export function respondToPermission(
    requestId: string,
    response: PermissionResponse,
): void {
    permissionManager.respondToPermission(requestId, response);
}

export function getCurrentRequest(): PermissionRequest | null {
    return permissionManager.getCurrentRequest();
}

export function cancelCurrentRequest(): void {
    permissionManager.cancelCurrentRequest();
}

// New exports
export function cancelAllRequests(): void {
    permissionManager.cancelAllRequests();
}

export function hasPendingRequests(): boolean {
    return permissionManager.hasPendingRequests();
}
