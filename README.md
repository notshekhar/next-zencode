# next-zencode

`next-zencode` is a powerful, self-hosted AI coding assistant and agent interface built with Next.js 16, React 19, and Bun. It provides an interactive chat interface that can perform real-world software engineering tasks by interacting with your local filesystem and executing shell commands.

## 🚀 Features

- **AI-Powered Coding**: Leverage advanced LLMs (like Google Gemini) to assist with coding, debugging, and project management.
- **Agent Modes**:
    - **PLAN Mode**: Brainstorm and architect solutions without making changes.
    - **BUILD Mode**: Confidently execute changes, create files, and run commands.
- **Rich Toolset**: The AI can explore and modify your codebase using built-in tools:
    - `bash`: Execute shell commands (with configurable permissions).
    - `readFile`, `writeFile`, `editFile`: Complete file manipulation.
    - `listFiles`, `searchFiles`, `grepSearch`: Deep exploration of your project.
    - `taskManager`: Track progress on complex, multi-step features.
    - `activateSkill`: Load specialized domain knowledge or workflows.
- **Modern UI**: A responsive, fast, and beautiful interface built with Tailwind CSS 4, Radix UI, and Framer Motion.
- **Type-Safe**: End-to-end type safety using tRPC and TypeScript.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Jotai](https://jotai.org/)
- **API**: [tRPC](https://trpc.io/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/), [Google Generative AI](https://aistudio.google.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Visualization**: [Mermaid.js](https://mermaid.js.org/), [Shiki](https://shiki.style/)

## 🏁 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system.
- A Google Gemini API Key (Get one at [Google AI Studio](https://aistudio.google.com/apikey)).

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/notshekhar/next-zencode.git
    cd next-zencode
    ```

2. Install dependencies:

    ```bash
    bun install
    ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your API key:

    ```env
    GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
    ```

4. Run the development server:
    ```bash
    bun dev
    ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

Zencode stores its configuration (API keys, tool permissions, allowed commands) in your home directory:

- **macOS/Linux**: `~/.config/zencode/config.json`
- **Windows**: `AppData/Roaming/zencode/config.json`

You can manage these settings directly through the application's UI.

## 📁 Project Structure

- `src/app`: Next.js pages, layouts, and API routes.
- `src/components`: UI components and design system.
- `src/server`: Backend logic, AI services, and tool implementations.
- `src/trpc`: tRPC client and server configuration.
- `src/store`: Client-side state management with Jotai.
- `src/lib`: Shared utility functions.

## 📜 License

[MIT](LICENSE)
