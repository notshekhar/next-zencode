"use client";

import { ChatInput } from "./chat-input";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Target, Clock } from "lucide-react";

const greetingMessageKeys = [
    "goodMorning",
    "goodAfternoon",
    "goodEvening",
    "niceToSeeYouAgain",
    "whatAreYouWorkingOnToday",
    "letMeKnowWhenYoureReadyToBegin",
    "whatAreYourThoughtsToday",
    "whereWouldYouLikeToStart",
    "whatAreYouThinking",
];

// Suggested questions for users to get started
const suggestedQuestions = [
    "How does blockchain mining work?",
    "What is cryptocurrency?",
    "Explain quantum computing in simple terms",
    "Help me write a professional email",
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
