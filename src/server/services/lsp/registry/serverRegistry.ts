/**
 * Server Registry - manages LSP server configurations
 * Open/Closed Principle: Extensible without modification
 */

import * as fs from "fs";
import * as path from "path";
import type {
    LanguageServerConfig,
    IServerRegistry,
    UserLspConfig,
} from "../types";
import { findProjectRoot } from "../utils/projectRoot";
import { isCommandAvailable, findTypeScriptServer } from "../utils/runtime";

/**
 * Get default server configurations
 * These are dynamically generated based on available tools
 */
function getDefaultConfigs(projectRoot: string): LanguageServerConfig[] {
    const configs: LanguageServerConfig[] = [];

    // TypeScript/JavaScript - auto-detect
    const tsServer = findTypeScriptServer(projectRoot);
    if (tsServer) {
        configs.push({
            id: "typescript-language-server",
            name: "TypeScript/JavaScript",
            transport: "stdio",
            command: tsServer.command,
            args: tsServer.args,
            env: tsServer.env,
            extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
            rootMarkers: ["tsconfig.json", "package.json", "jsconfig.json"],
            languageIds: {
                ".ts": "typescript",
                ".tsx": "typescriptreact",
                ".js": "javascript",
                ".jsx": "javascriptreact",
                ".mjs": "javascript",
                ".cjs": "javascript",
            },
        });
    }

    // Go - gopls
    if (isCommandAvailable("gopls")) {
        configs.push({
            id: "gopls",
            name: "Go",
            transport: "stdio",
            command: "gopls",
            args: ["serve"],
            extensions: [".go"],
            rootMarkers: ["go.mod"],
            languageIds: { ".go": "go" },
        });
    }

    // Python - pylsp or pyright
    if (isCommandAvailable("pylsp")) {
        configs.push({
            id: "pylsp",
            name: "Python",
            transport: "stdio",
            command: "pylsp",
            args: [],
            extensions: [".py"],
            languageIds: { ".py": "python" },
        });
    } else if (isCommandAvailable("pyright-langserver")) {
        configs.push({
            id: "pyright",
            name: "Python (Pyright)",
            transport: "stdio",
            command: "pyright-langserver",
            args: ["--stdio"],
            extensions: [".py"],
            languageIds: { ".py": "python" },
        });
    }

    // Rust - rust-analyzer
    if (isCommandAvailable("rust-analyzer")) {
        configs.push({
            id: "rust-analyzer",
            name: "Rust",
            transport: "stdio",
            command: "rust-analyzer",
            args: [],
            extensions: [".rs"],
            rootMarkers: ["Cargo.toml"],
            languageIds: { ".rs": "rust" },
        });
    }

    // Zig - zls
    if (isCommandAvailable("zls")) {
        configs.push({
            id: "zls",
            name: "Zig",
            transport: "stdio",
            command: "zls",
            args: [],
            extensions: [".zig"],
            rootMarkers: ["build.zig"],
            languageIds: { ".zig": "zig" },
        });
    }

    // C/C++ - clangd
    if (isCommandAvailable("clangd")) {
        configs.push({
            id: "clangd",
            name: "C/C++",
            transport: "stdio",
            command: "clangd",
            args: [],
            extensions: [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"],
            rootMarkers: ["compile_commands.json", "CMakeLists.txt"],
            languageIds: {
                ".c": "c",
                ".cpp": "cpp",
                ".cc": "cpp",
                ".cxx": "cpp",
                ".h": "c",
                ".hpp": "cpp",
            },
        });
    }

    // Lua - lua-language-server
    if (isCommandAvailable("lua-language-server")) {
        configs.push({
            id: "lua-language-server",
            name: "Lua",
            transport: "stdio",
            command: "lua-language-server",
            args: [],
            extensions: [".lua"],
            languageIds: { ".lua": "lua" },
        });
    }

    // Ruby - solargraph
    if (isCommandAvailable("solargraph")) {
        configs.push({
            id: "solargraph",
            name: "Ruby",
            transport: "stdio",
            command: "solargraph",
            args: ["stdio"],
            extensions: [".rb"],
            rootMarkers: ["Gemfile"],
            languageIds: { ".rb": "ruby" },
        });
    }

    return configs;
}

export class ServerRegistry implements IServerRegistry {
    private customConfigs: Map<string, LanguageServerConfig> = new Map();
    private userConfigCache: Map<string, UserLspConfig> = new Map();
    private defaultConfigCache: Map<string, LanguageServerConfig[]> = new Map();

    /**
     * Get all configs applicable to a project
     */
    getConfigs(projectRoot: string): LanguageServerConfig[] {
        if (process.env.ZENCODE_DISABLE_LSP === "true") {
            return [];
        }

        const userConfig = this.loadUserConfig(projectRoot);

        if (userConfig.lsp === false) {
            return [];
        }

        // Get default configs (cached per project root)
        let defaultConfigs = this.defaultConfigCache.get(projectRoot);
        if (!defaultConfigs) {
            defaultConfigs = getDefaultConfigs(projectRoot);
            this.defaultConfigCache.set(projectRoot, defaultConfigs);
        }

        const result: LanguageServerConfig[] = [];
        const userOverrides = userConfig.lsp || {};
        const processedIds = new Set<string>();

        // Apply user overrides to default configs
        for (const config of defaultConfigs) {
            const override = userOverrides[config.id];

            if (override?.disabled) {
                processedIds.add(config.id);
                continue;
            }

            if (override) {
                result.push(this.mergeConfig(config, override));
            } else {
                result.push(config);
            }
            processedIds.add(config.id);
        }

        // Add custom registered configs
        for (const [id, config] of this.customConfigs) {
            if (processedIds.has(id)) continue;
            const override = userOverrides[id];
            if (override?.disabled) continue;

            if (override) {
                result.push(this.mergeConfig(config, override));
            } else {
                result.push(config);
            }
            processedIds.add(id);
        }

        // Add entirely custom user-defined servers
        for (const [id, customConfig] of Object.entries(userOverrides)) {
            if (processedIds.has(id)) continue;
            if ((customConfig as { disabled?: boolean }).disabled) continue;

            if (this.isValidCustomConfig(customConfig)) {
                result.push({
                    id,
                    name: customConfig.name || id,
                    transport: customConfig.transport || "stdio",
                    command: customConfig.command,
                    args: customConfig.args || [],
                    host: customConfig.host,
                    port: customConfig.port,
                    extensions: customConfig.extensions!,
                    rootMarkers: customConfig.rootMarkers,
                    languageIds: customConfig.languageIds || {},
                    initializationOptions: customConfig.initializationOptions,
                    env: customConfig.env,
                });
            }
        }

        return result;
    }

    /**
     * Get config for a specific file
     */
    getConfigForFile(filePath: string): LanguageServerConfig | null {
        const ext = "." + filePath.split(".").pop();
        const projectRoot = findProjectRoot(filePath);
        const configs = this.getConfigs(projectRoot);

        return configs.find((c) => c.extensions.includes(ext)) || null;
    }

    /**
     * Register a new server config programmatically
     */
    registerConfig(config: LanguageServerConfig): void {
        this.customConfigs.set(config.id, config);
    }

    /**
     * Unregister a server config
     */
    unregisterConfig(id: string): void {
        this.customConfigs.delete(id);
    }

    /**
     * Load user config from project
     */
    private loadUserConfig(projectRoot: string): UserLspConfig {
        // Check cache
        if (this.userConfigCache.has(projectRoot)) {
            return this.userConfigCache.get(projectRoot)!;
        }

        let userConfig: UserLspConfig = {};

        // Try zencode.json first
        const zencodeConfigPath = path.join(projectRoot, "zencode.json");
        if (fs.existsSync(zencodeConfigPath)) {
            try {
                const content = fs.readFileSync(zencodeConfigPath, "utf-8");
                userConfig = JSON.parse(content);
            } catch (e) {
                console.error(`Failed to parse zencode.json: ${e}`);
            }
        } else {
            // Try package.json
            const pkgPath = path.join(projectRoot, "package.json");
            if (fs.existsSync(pkgPath)) {
                try {
                    const content = fs.readFileSync(pkgPath, "utf-8");
                    const pkg = JSON.parse(content);
                    if (pkg.zencode) {
                        userConfig = pkg.zencode;
                    }
                } catch {
                    // Ignore
                }
            }
        }

        this.userConfigCache.set(projectRoot, userConfig);
        return userConfig;
    }

    private mergeConfig(
        base: LanguageServerConfig,
        override: Partial<LanguageServerConfig>,
    ): LanguageServerConfig {
        return {
            ...base,
            ...override,
            id: base.id, // ID cannot be overridden
            languageIds: { ...base.languageIds, ...override.languageIds },
            initializationOptions: {
                ...base.initializationOptions,
                ...override.initializationOptions,
            },
        };
    }

    private isValidCustomConfig(
        config: Partial<LanguageServerConfig> & { disabled?: boolean },
    ): config is Partial<LanguageServerConfig> & {
        extensions: string[];
    } & ({ command: string } | { host: string; port: number }) {
        if (
            !Array.isArray(config.extensions) ||
            config.extensions.length === 0
        ) {
            return false;
        }

        // Must have either command (stdio) or host+port (tcp)
        if (config.transport === "tcp") {
            return (
                typeof config.host === "string" &&
                typeof config.port === "number"
            );
        }

        return typeof config.command === "string";
    }

    /**
     * Clear all caches (useful when config files change)
     */
    clearCache(): void {
        this.userConfigCache.clear();
        this.defaultConfigCache.clear();
    }
}

// Singleton instance
export const serverRegistry = new ServerRegistry();
