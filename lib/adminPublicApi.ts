type QueryValue = string | number | boolean | null | undefined;

export function getAdminPublicApiBaseUrl() {
  const value = process.env.ADMIN_PUBLIC_API_BASE_URL?.trim();

  if (!value) {
    throw new Error("ADMIN_PUBLIC_API_BASE_URL is required.");
  }

  return value.replace(/\/+$/, "");
}

export async function fetchAdminPublicApi<T>(
  path: string,
  query?: Record<string, QueryValue>
) {
  const baseUrl = getAdminPublicApiBaseUrl();
  const url = new URL(`${baseUrl}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as T | { message?: string } | null;

  if (!res.ok) {
    throw new Error(
      (json && typeof json === "object" && "message" in json && json.message) ||
        `Failed to fetch ${path}`
    );
  }

  return json as T;
}
