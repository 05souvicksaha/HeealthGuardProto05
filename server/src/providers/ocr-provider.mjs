import { env } from "../config/env.mjs";
import { providerUnavailable } from "../lib/errors.mjs";

export class DisabledOCRProvider {
  constructor() { this.name = "disabled"; }
  status() { return { provider: this.name, configured: false }; }
  async extract() { throw providerUnavailable("OCR provider"); }
}

export class HttpOCRProvider {
  constructor() { this.name = env.ocrProvider; }
  status() { return { provider: this.name, configured: Boolean(env.ocrApiUrl && env.ocrApiKey) }; }
  async extract({ buffer, mimeType }) {
    if (!this.status().configured) throw providerUnavailable("OCR provider");
    const response = await fetch(env.ocrApiUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${env.ocrApiKey}`, "content-type": mimeType },
      body: buffer,
      signal: AbortSignal.timeout(25_000)
    });
    if (!response.ok) throw new Error(`OCR provider returned ${response.status}`);
    return response.json();
  }
}

export function createOCRProvider() {
  return env.ocrProvider === "disabled" ? new DisabledOCRProvider() : new HttpOCRProvider();
}

