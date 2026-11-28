export async function readApiResponse<T extends { error?: string } = { error?: string }>(
  response: Response,
  fallbackError: string
): Promise<T> {
  const text = await response.text();
  let parsed: Partial<T> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Partial<T>;
    } catch {
      parsed = {};
    }
  }
  if (!response.ok) {
    throw new Error(parsed.error ?? `${fallbackError} (HTTP ${response.status})`);
  }
  return parsed as T;
}
