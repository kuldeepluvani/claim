const DEFAULT_WORKER_URL = "http://localhost:2626";
const TIMEOUT_MS = 5000;

interface HookResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleHookCli(
  event: string,
  payload: Record<string, unknown>,
  workerUrl: string = DEFAULT_WORKER_URL
): Promise<HookResult> {
  const url = `${workerUrl}/hooks/${event}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    // Fail silently on connection errors
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function parseHookStdin(): Promise<Record<string, unknown>> {
  try {
    const text = await Bun.stdin.text();
    return JSON.parse(text);
  } catch {
    return {};
  }
}
