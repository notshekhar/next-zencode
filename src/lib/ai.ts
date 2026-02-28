import { generateText, LanguageModel, ModelMessage } from "ai";

export async function generateChatTitle(
    model: LanguageModel,
    messages: ModelMessage[],
) {
    const prompt = `
        You are a assistant that tells the title for the chat based on the user's query.

        # Guidelines:
        - The title should be a single sentence that captures the main idea of the chat.
        - The title should be no more than 10 words.
        - The title should be in the same language as the user's query.

        # Example:
        User: What is the capital of France?
        Assistant: Capital of France

        User: Write a poem about the sky
        Assistant: Sky Poem
        `;

    const response = await generateText({
        model: model,
        system: prompt,
        messages,
    });

    return response.text;
}
