import { env } from "../config/env.mjs";
import { providerUnavailable } from "../lib/errors.mjs";

export class DisabledAIProvider {
  constructor() { this.name = "disabled"; }
  status() { return { provider: this.name, configured: false }; }
  async healthAssistant() { throw providerUnavailable("AI provider"); }
  async analyzeReport() { throw providerUnavailable("AI provider"); }
  async matchConditions() { throw providerUnavailable("AI provider"); }
}

export class HttpAIProvider {
  constructor() {
    this.name = env.aiProvider;
  }

  status() {
    return { provider: this.name, configured: Boolean(env.aiApiUrl && env.aiApiKey && env.aiModel), model: env.aiModel || null };
  }

  async request(task, payload) {
    if (!this.status().configured) throw providerUnavailable("AI provider");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(env.aiApiUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.aiApiKey}` },
        body: JSON.stringify({ model: env.aiModel, task, payload }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  healthAssistant(payload) { return this.request("health-assistant", payload); }
  analyzeReport(payload) { return this.request("report-analysis", payload); }
  matchConditions(payload) { return this.request("condition-matching", payload); }
}

export function createAIProvider() {
  return env.aiProvider === "disabled" ? new DisabledAIProvider() : new HttpAIProvider();
}

