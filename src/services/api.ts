export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "DEVELOPER" | "ADMIN" | "DRIVER";
  emailVerified: boolean;
  status: "ACTIVE" | "DISABLED";
  preferences?: { theme?: "system" | "light" | "dark"; sound?: boolean };
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, payload: { code?: string; message?: string; details?: unknown }) {
    super(payload.message ?? "HealthGuard could not complete this request.");
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code ?? "REQUEST_FAILED";
    this.details = payload.details;
  }
}

let accessToken = "";
let refreshPromise: Promise<{ user: AuthUser; accessToken: string }> | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload.error ?? payload);
  return payload as T;
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
      .then((response) => parse<{ user: AuthUser; accessToken: string }>(response))
      .then((result) => { accessToken = result.accessToken; return result; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function refreshAccess(): Promise<boolean> {
  try {
    await refreshSession();
    return true;
  } catch {
    accessToken = "";
    return false;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshAccess()) return apiRequest<T>(path, init, false);
  }
  return parse<T>(response);
}

export const api = {
  async login(input: { email: string; password: string }) {
    const result = await apiRequest<{ user: AuthUser; accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    setAccessToken(result.accessToken);
    return result.user;
  },
  async register(input: { name: string; email: string; password: string; invitationToken?: string }) {
    const result = await apiRequest<{ user: AuthUser; accessToken: string; verificationPreviewCode?: string }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
    setAccessToken(result.accessToken);
    return { user: result.user, verificationPreviewCode: result.verificationPreviewCode };
  },
  async refresh() {
    const result = await refreshSession();
    return result.user;
  },
  async logout() {
    try { await apiRequest<void>("/auth/logout", { method: "POST" }, false); } finally { setAccessToken(""); }
  },
  get<T>(path: string, signal?: AbortSignal) { return apiRequest<T>(path, { signal }); },
  post<T>(path: string, body?: unknown) { return apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }); },
  patch<T>(path: string, body: unknown) { return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }); },
  delete(path: string) { return apiRequest<void>(path, { method: "DELETE" }); },
  async download(path: string) {
    const request = () => fetch(`/api/v1${path}`, { credentials: "include", headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined });
    let response = await request();
    if (response.status === 401 && await refreshAccess()) response = await request();
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new ApiError(response.status, payload.error ?? payload);
    }
    return { blob: await response.blob(), disposition: response.headers.get("content-disposition") };
  },
  uploadReport(formData: FormData, onProgress?: (progress: number) => void) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/v1/reports");
      xhr.withCredentials = true;
      if (accessToken) xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const payload = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new ApiError(xhr.status, payload.error ?? payload));
      };
      xhr.onerror = () => reject(new ApiError(0, { code: "NETWORK_ERROR", message: "Upload could not reach HealthGuard." }));
      xhr.send(formData);
    });
  },
  uploadPatientPhoto(patientId: string, formData: FormData, onProgress?: (progress: number) => void) {
    return new Promise<{ id: string; patientId: string; mimeType: string; size: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/v1/patients/${encodeURIComponent(patientId)}/photo`);
      xhr.withCredentials = true;
      if (accessToken) xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const payload = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new ApiError(xhr.status, payload.error ?? payload));
      };
      xhr.onerror = () => reject(new ApiError(0, { code: "NETWORK_ERROR", message: "Photo upload could not reach HealthGuard." }));
      xhr.send(formData);
    });
  }
};
