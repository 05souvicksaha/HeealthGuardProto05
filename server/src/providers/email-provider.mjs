import { env } from "../config/env.mjs";

export class ConsoleEmailProvider {
  constructor() { this.name = "console"; }
  status() { return { provider: this.name, configured: !env.isProduction }; }
  async send(message) {
    if (env.isProduction) throw new Error("Console email provider is disabled in production.");
    if (process.env.NODE_ENV !== "test") console.info(`[HealthGuard email preview] ${message.subject} -> ${message.to}`);
    return { accepted: true, preview: true };
  }
}

export function createEmailProvider() {
  if (env.emailProvider !== "console") {
    return {
      name: env.emailProvider,
      status: () => ({ provider: env.emailProvider, configured: false }),
      send: async () => { throw new Error(`EMAIL_PROVIDER ${env.emailProvider} requires an adapter.`); }
    };
  }
  return new ConsoleEmailProvider();
}

