import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST — kick off indexing in the background, return immediately.
 */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const fullReindex = body?.full === true;

    const {
        isIndexing,
        markStarted,
        markFinished,
        pushEvent,
    } = await import("@/mom/embeddings/progress");

    if (isIndexing()) {
        return Response.json(
            { error: "Indexing already in progress" },
            { status: 409 },
        );
    }

    markStarted();
    pushEvent({ type: "scanning", message: "Starting...", percent: 0 });

    // Fire-and-forget: run indexing without awaiting so the response returns immediately.
    const { indexProject, reindexProject } = await import(
        "@/mom/embeddings/indexer"
    );
    const cwd = process.cwd();
    const fn = fullReindex ? reindexProject : indexProject;

    fn(cwd, (event) => {
        pushEvent(event);
    })
        .catch((err: any) => {
            pushEvent({
                type: "error",
                message: String(err?.message || err),
                percent: 0,
            });
        })
        .finally(() => {
            markFinished();
        });

    return Response.json({ started: true });
}

/**
 * GET — SSE stream that polls global progress state and pushes events.
 */
export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const { drainEvents, isIndexing, getLastEvent } = await import(
                "@/mom/embeddings/progress"
            );

            function send(data: Record<string, unknown>) {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
                    );
                } catch {
                    // stream closed
                }
            }

            const poll = async () => {
                const maxPollMs = 10 * 60 * 1000; // 10 min timeout
                const started = Date.now();

                while (Date.now() - started < maxPollMs) {
                    const events = drainEvents();
                    for (const event of events) {
                        send(event);
                    }

                    // If indexing finished (and we drained the final events), stop.
                    if (!isIndexing() && events.length === 0) {
                        const last = getLastEvent();
                        if (last && (last.type === "done" || last.type === "error")) {
                            break;
                        }
                    }

                    await new Promise((r) => setTimeout(r, 150));
                }

                controller.close();
            };

            poll();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
