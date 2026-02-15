/**
 * Configuration Service with caching
 *
 * Single Responsibility: Manages configuration loading and caching
 * Open/Closed: Easy to extend with file watching or different storage backends
 * Dependency Inversion: Depends on abstractions (could be extended to use different storage)
 */

import * as fs from "fs";
import * as path from "path";

// Types
export type ProviderType = "google" | "openai" | "anthropic" | "groq" | "ollama";
export type PermissionLevel = "ask" | "allow" | "deny";

export interface ProviderConfig {
    apiKey?: string;
    enabled: boolean;
    model?: string;
}

export interface ToolPermissions {
    bash: PermissionLevel;
    write: PermissionLevel;
    edit: PermissionLevel;
    read: PermissionLevel;
    glob: PermissionLevel;
    grep: PermissionLevel;
}

export interface ZencodeConfig {
    activeProvider: ProviderType;
    providers: Partial<Record<ProviderType, ProviderConfig>>;
    permissions: ToolPermissions;
    allowedCommands: string[];
    sandboxMode: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ZencodeConfig = {
    activeProvider: "google",
    providers: {
        google: { enabled: false },
    },
    permissions: {
        bash: "ask",
        write: "ask",
        edit: "ask",
        read: "allow",
        glob: "allow",
        grep: "allow",
    },
    allowedCommands: [],
    sandboxMode: true,
};

/**
 * ConfigService - Singleton with lazy loading and caching
 */
class ConfigService {
    private cache: ZencodeConfig | null = null;
    private lastLoadTime: number = 0;
    private configPath: string;

    // Cache TTL in milliseconds (5 seconds)
    private static readonly CACHE_TTL = 5000;

    constructor() {
        this.configPath = this.getConfigPath();
    }

    private getConfigDir(): string {
        const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
        const configBase =
            process.platform === "darwin" || process.platform === "linux"
                ? path.join(homeDir, ".config")
                : path.join(homeDir, "AppData", "Roaming");

        const dir = path.join(configBase, "zencode");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    private getConfigPath(): string {
        return path.join(this.getConfigDir(), "config.json");
    }

    /**
     * Check if cache is still valid
     */
    private isCacheValid(): boolean {
        if (!this.cache) return false;
        return Date.now() - this.lastLoadTime < ConfigService.CACHE_TTL;
    }

    /**
     * Load configuration from disk with caching
     */
    load(): ZencodeConfig {
        if (this.isCacheValid() && this.cache) {
            return this.cache;
        }

        if (!fs.existsSync(this.configPath)) {
            this.cache = { ...DEFAULT_CONFIG };
            this.lastLoadTime = Date.now();
            return this.cache;
        }

        try {
            const data = fs.readFileSync(this.configPath, "utf-8");
            const rawConfig = JSON.parse(data);

            // Handle backward compatibility with old config format
            if (rawConfig.apiKey && !rawConfig.providers) {
                const migratedConfig: ZencodeConfig = {
                    activeProvider: "google",
                    providers: {
                        google: {
                            apiKey: rawConfig.apiKey,
                            enabled: true,
                            model: rawConfig.model,
                        },
                    },
                    permissions:
                        rawConfig.permissions || DEFAULT_CONFIG.permissions,
                    allowedCommands: rawConfig.allowedCommands || [],
                    sandboxMode: rawConfig.sandboxMode !== false,
                };
                this.cache = { ...DEFAULT_CONFIG, ...migratedConfig };
            } else {
                this.cache = {
                    ...DEFAULT_CONFIG,
                    ...rawConfig,
                    allowedCommands: rawConfig.allowedCommands || [],
                    sandboxMode: rawConfig.sandboxMode !== false,
                };
            }

            this.lastLoadTime = Date.now();
            return this.cache!;
        } catch {
            this.cache = { ...DEFAULT_CONFIG };
            this.lastLoadTime = Date.now();
            return this.cache;
        }
    }

    /**
     * Save configuration to disk and update cache
     */
    save(config: ZencodeConfig): void {
        // Read existing config to preserve other fields
        let existingConfig: Record<string, unknown> = {};
        if (fs.existsSync(this.configPath)) {
            try {
                existingConfig = JSON.parse(
                    fs.readFileSync(this.configPath, "utf-8"),
                );
            } catch {
                // Ignore parse errors
            }
        }

        // Remove old apiKey field if it exists
        delete existingConfig.apiKey;

        // Merge new config with existing
        const merged = {
            ...existingConfig,
            activeProvider: config.activeProvider,
            providers: config.providers,
            permissions: config.permissions,
            allowedCommands: config.allowedCommands,
            sandboxMode: config.sandboxMode,
        };

        fs.writeFileSync(
            this.configPath,
            JSON.stringify(merged, null, 2),
            "utf-8",
        );

        // Update cache
        this.cache = config;
        this.lastLoadTime = Date.now();
    }

    /**
     * Invalidate cache (useful when config might have changed externally)
     */
    invalidateCache(): void {
        this.cache = null;
        this.lastLoadTime = 0;
    }

    /**
     * Get permissions from cached config
     */
    getPermissions(): ToolPermissions {
        return this.load().permissions;
    }

    /**
     * Get allowed commands from cached config
     */
    getAllowedCommands(): string[] {
        return this.load().allowedCommands || [];
    }

    /**
     * Add a command to the allowed list
     */
    addAllowedCommand(command: string): void {
        const config = this.load();
        const baseCommand = command.trim().split(/\s+/)[0] || "";

        if (!config.allowedCommands.includes(baseCommand)) {
            config.allowedCommands.push(baseCommand);
            this.save(config);
        }
    }

    /**
     * Check if sandbox mode is enabled
     */
    isSandboxEnabled(): boolean {
        return this.load().sandboxMode !== false;
    }

    /**
     * Check if a command is allowed
     */
    isCommandAllowed(command: string): "always" | "ask" | "deny" {
        const baseCommand = command.trim().split(/\s+/)[0] || "";
        const config = this.load();

        // Check if user has permanently allowed this command
        if (config.allowedCommands.includes(baseCommand)) {
            return "always";
        }

        // Check global bash permission setting
        if (config.permissions.bash === "allow") {
            return "always";
        }

        if (config.permissions.bash === "deny") {
            return "deny";
        }

        return "ask";
    }

    /**
     * Get API key for a provider
     */
    getProviderApiKey(provider: ProviderType): string | undefined {
        const config = this.load();
        return config.providers[provider]?.apiKey;
    }

    /**
     * Set API key for a provider
     */
    setProviderApiKey(provider: ProviderType, apiKey: string): void {
        const config = this.load();

        if (!config.providers[provider]) {
            config.providers[provider] = { enabled: false };
        }

        config.providers[provider]!.apiKey = apiKey;
        config.providers[provider]!.enabled = true;

        this.save(config);
    }

    /**
     * Get active provider
     */
    getActiveProvider(): ProviderType {
        return this.load().activeProvider;
    }

    /**
     * Set active provider
     */
    setActiveProvider(provider: ProviderType): void {
        const config = this.load();
        config.activeProvider = provider;
        this.save(config);
    }

    /**
     * Check if a provider is configured
     */
    isProviderConfigured(provider: ProviderType): boolean {
        const config = this.load();
        return !!config.providers[provider]?.apiKey;
    }

    /**
     * Get Google API key (with env variable fallback)
     */
    getGoogleApiKey(): string | undefined {
        // First check env variable for backward compatibility
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        }
        return this.load().providers.google?.apiKey;
    }
}

// Export singleton instance
export const configService = new ConfigService();

// Provider display information
export const PROVIDER_INFO: Record<
    ProviderType,
    { name: string; description: string; urlHint: string }
> = {
    google: {
        name: "Google (Gemini)",
        description: "Google's Gemini AI models",
        urlHint: "Get API key: https://aistudio.google.com/apikey",
    },
    openai: {
        name: "OpenAI",
        description: "GPT-4 and other OpenAI models",
        urlHint: "Get API key: https://platform.openai.com/api-keys",
    },
    anthropic: {
        name: "Anthropic (Claude)",
        description: "Claude AI models",
        urlHint: "Get API key: https://console.anthropic.com/",
    },
    groq: {
        name: "Groq",
        description: "Ultra-fast Llama 3 models",
        urlHint: "Get API key: https://console.groq.com/keys",
    },
    ollama: {
        name: "Ollama (Local)",
        description: "Run models locally with Ollama",
        urlHint: "Install: https://ollama.ai",
    },
};

export const AVAILABLE_PROVIDERS: ProviderType[] = ["google", "groq", "ollama"];
export const COMING_SOON_PROVIDERS: ProviderType[] = [
    "openai",
    "anthropic",
];
// Safe readonly commands

// Safe readonly commands
export const SAFE_READONLY_COMMANDS = [
    "ls",
    "pwd",
    "echo",
    "cat",
    "head",
    "tail",
    "wc",
    "grep",
    "find",
    "which",
    "whoami",
    "date",
    "cal",
    "tree",
    "file",
    "stat",
    "du",
    "df",
] as const;

// Dangerous commands
export const DANGEROUS_COMMANDS = [
    "rm",
    "mv",
    "cp",
    "mkdir",
    "rmdir",
    "touch",
    "chmod",
    "chown",
    "git",
    "npm",
    "yarn",
    "pnpm",
    "bun",
    "node",
    "python",
    "pip",
    "curl",
    "wget",
    "ssh",
    "scp",
    "docker",
    "kubectl",
] as const;
