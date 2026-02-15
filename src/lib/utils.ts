import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const createEmitter = () => {
    const listeners = new Set<(value: string) => void>();
    return {
        on: (listener: (value: string) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        off: (listener: (value: string) => void) => {
            listeners.delete(listener);
        },
        emit: (value: string) => {
            listeners.forEach((listener) => listener(value));
        },
    };
};

export const isString = (value: any): value is string =>
    typeof value === "string";

export const isFunction = <
    T extends (...args: any[]) => any = (...args: any[]) => any,
>(
    v: unknown,
): v is T => typeof v === "function";

export const isObject = (value: any): value is Record<string, any> =>
    Object(value) === value;

export const isNull = (value: any): value is null | undefined => value == null;

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
    isFunction((x as any)?.then);

export const isJson = (value: any): value is Record<string, any> => {
    try {
        if (typeof value === "string") {
            const str = value.trim();
            JSON.parse(str);
            return true;
        } else if (isObject(value)) {
            return true;
        }
        return false;
    } catch (_e) {
        return false;
    }
};

export const createDebounce = () => {
    let timeout: ReturnType<typeof setTimeout>;

    const debounce = (func: (...args: any[]) => any, waitFor = 200) => {
        clearTimeout(timeout!);
        timeout = setTimeout(() => func(), waitFor);
        return timeout;
    };

    debounce.clear = () => {
        clearTimeout(timeout!);
    };
    return debounce;
};

export function toAny<T>(value: T): any {
    return value;
}

export function errorToString(error: unknown) {
    if (error == null) {
        return "unknown error";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return JSON.stringify(error);
}

export function formatBytes(bytes: number, decimals = 0) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
