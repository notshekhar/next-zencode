import { Chat } from "@/components/chat";
import { getSession, getUIMessages } from "@/server/db/database";
import { notFound } from "next/navigation";

export default async function ChatThreadPage({
    params,
}: {
    params: Promise<{ threadId: string }>;
}) {
    const { threadId } = await params;
    const session = getSession(threadId);
    if (!session) return notFound();

    const messages = getUIMessages(threadId);
    return <Chat threadId={threadId} initialMessages={messages} />;
}
