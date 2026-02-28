"use server";

import { cookies } from "next/headers";

export async function getServerCookies(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const cookieMap: Record<string, string> = {};

    cookieStore.getAll().forEach((cookie) => {
        cookieMap[cookie.name] = cookie.value;
    });

    return cookieMap;
}

export async function getServerCookie(
    name: string,
): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
}
