import { Chat } from "@/components/chat";
import { v4 } from "uuid";

export default function ThreadPage() {
    const id = v4();
    return <Chat threadId={id} />;
}
