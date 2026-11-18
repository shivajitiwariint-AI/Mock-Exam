export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ErrorEnvelope = {
  error?: { code?: string; message?: string; details?: unknown };
};

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = (payload ?? {}) as ErrorEnvelope;
    throw new ApiClientError(
      response.status,
      envelope.error?.code ?? "REQUEST_FAILED",
      envelope.error?.message ?? `Request failed with status ${response.status}.`,
      envelope.error?.details,
    );
  }

  const envelope = payload as { data?: T } | null;
  return (envelope?.data ?? (payload as T)) as T;
}

export function apiUpload<T>(
  input: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", input);
    xhr.withCredentials = true;
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onerror = () => {
      reject(new ApiClientError(0, "NETWORK_ERROR", "Upload failed. Check your connection and try again."));
    };

    xhr.onabort = () => {
      reject(new ApiClientError(0, "UPLOAD_ABORTED", "Upload was cancelled."));
    };

    xhr.onload = () => {
      if (xhr.status === 204) {
        resolve(undefined as T);
        return;
      }

      let payload: unknown = null;
      if (xhr.responseText) {
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = null;
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const envelope = (payload ?? {}) as ErrorEnvelope;
        reject(
          new ApiClientError(
            xhr.status,
            envelope.error?.code ?? "REQUEST_FAILED",
            envelope.error?.message ?? `Request failed with status ${xhr.status}.`,
            envelope.error?.details,
          ),
        );
        return;
      }

      const envelope = payload as { data?: T } | null;
      resolve((envelope?.data ?? (payload as T)) as T);
    };

    xhr.send(form);
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
