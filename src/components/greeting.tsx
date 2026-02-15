"use client";

import { ChatInput } from "./chat-input";
import { useState, useEffect } from "react";

const greetingMessageKeys = [
    "Good Morning",
    "Good Afternoon",
    "Good Evening",
    "Nice To See You Again",
    "What Are You Working On Today",
    "Let Me Know When You're Ready To Begin",
    "What Are Your Thoughts Today",
    "Where Would You Like To Start",
    "What Are You Thinking",
];

export function Greeting(props: {
    onFirstMessageSend: (input: string) => void;
}) {
    const [randomMessage, setRandomMessage] = useState("");

    useEffect(() => {
        const randomIndex = Math.floor(
            Math.random() * greetingMessageKeys.length,
        );
        const selectedKey = greetingMessageKeys[randomIndex];

        setRandomMessage(selectedKey);
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <div className="flex flex-col items-center w-full max-w-3xl -mt-16">
                {/* Random Greeting Message */}
                {randomMessage && (
                    <div className="text-center mb-6 w-full">
                        <h1 className="text-xl text-foreground font-medium">
                            {randomMessage}
                        </h1>
                    </div>
                )}

                {/* Chat Input */}
                <div className="w-full mb-8">
                    <ChatInput onSend={props.onFirstMessageSend} />
                </div>
            </div>
        </div>
    );
}
