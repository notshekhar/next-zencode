type ToolExecutionMode = "read" | "write";

const MAX_PARALLEL_READS = 6;

let activeReads = 0;
const readWaiters: Array<() => void> = [];

let writeChain: Promise<void> = Promise.resolve();

async function acquireReadSlot(): Promise<void> {
    if (activeReads < MAX_PARALLEL_READS) {
        activeReads++;
        return;
    }

    await new Promise<void>((resolve) => {
        readWaiters.push(resolve);
    });
    activeReads++;
}

function releaseReadSlot(): void {
    activeReads = Math.max(0, activeReads - 1);
    const next = readWaiters.shift();
    if (next) {
        next();
    }
}

async function runReadOperation<T>(operation: () => Promise<T>): Promise<T> {
    await acquireReadSlot();
    try {
        return await operation();
    } finally {
        releaseReadSlot();
    }
}

async function runWriteOperation<T>(operation: () => Promise<T>): Promise<T> {
    const previous = writeChain;
    let releaseCurrent: (() => void) | undefined;

    writeChain = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
    });

    await previous;
    try {
        return await operation();
    } finally {
        releaseCurrent?.();
    }
}

export async function withToolScheduling<T>(
    mode: ToolExecutionMode,
    operation: () => Promise<T>,
): Promise<T> {
    if (mode === "read") {
        return runReadOperation(operation);
    }
    return runWriteOperation(operation);
}
