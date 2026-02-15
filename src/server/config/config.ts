/**
 * Configuration Module
 *
 * This file re-exports from configService for backward compatibility.
 * New code should import directly from '../services/configService'
 */

import {
    configService,
    type ProviderType,
    type PermissionLevel,
    type ProviderConfig,
    type ToolPermissions,
    type ZencodeConfig,
    PROVIDER_INFO,
    AVAILABLE_PROVIDERS,
    COMING_SOON_PROVIDERS,
    SAFE_READONLY_COMMANDS,
    DANGEROUS_COMMANDS,
} from "../services/configService";

export type {
    ProviderType,
    PermissionLevel,
    ProviderConfig,
    ToolPermissions,
    ZencodeConfig,
};

export {
    PROVIDER_INFO,
    AVAILABLE_PROVIDERS,
    COMING_SOON_PROVIDERS,
    SAFE_READONLY_COMMANDS,
    DANGEROUS_COMMANDS,
};

export function loadConfig(): ZencodeConfig {
    return configService.load();
}

export function saveConfig(config: ZencodeConfig): void {
    configService.save(config);
}

export function getProviderApiKey(provider: ProviderType): string | undefined {
    return configService.getProviderApiKey(provider);
}

export function setProviderApiKey(
    provider: ProviderType,
    apiKey: string,
): void {
    configService.setProviderApiKey(provider, apiKey);
}

export function getActiveProvider(): ProviderType {
    return configService.getActiveProvider();
}

export function setActiveProvider(provider: ProviderType): void {
    configService.setActiveProvider(provider);
}

export function isProviderConfigured(provider: ProviderType): boolean {
    return configService.isProviderConfigured(provider);
}

export function getGoogleApiKey(): string | undefined {
    return configService.getGoogleApiKey();
}

export function getPermissions(): ToolPermissions {
    return configService.getPermissions();
}

export function getAllowedCommands(): string[] {
    return configService.getAllowedCommands();
}

export function addAllowedCommand(command: string): void {
    configService.addAllowedCommand(command);
}

export function isCommandAllowed(command: string): "always" | "ask" | "deny" {
    return configService.isCommandAllowed(command);
}

export function isSandboxEnabled(): boolean {
    return configService.isSandboxEnabled();
}
