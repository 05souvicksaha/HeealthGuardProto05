const criticalPhrases = [
  "not breathing", "unresponsive", "severe chest pain", "face drooping", "sudden weakness",
  "uncontrolled bleeding", "choking", "seizure over 5 minutes", "blue lips", "suicidal"
];
const highPhrases = ["difficulty breathing", "shortness of breath", "heavy bleeding", "confusion", "fainted", "poisoning"];

function tokens(text) {
  return new Set(String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((term) => term.length > 2));
}

function scoreProtocol(inputTokens, protocol) {
  const searchable = tokens(`${protocol.title} ${protocol.tags.join(" ")} ${protocol.cat}`);
  let score = 0;
  inputTokens.forEach((term) => { if (searchable.has(term)) score += 2; else if ([...searchable].some((word) => word.includes(term) || term.includes(word))) score += 0.5; });
  return score;
}

export function createTriageService(protocols) {
  return {
    assess(input) {
      const text = String(input ?? "").trim();
      const normalized = text.toLowerCase();
      const criticalMatches = criticalPhrases.filter((phrase) => normalized.includes(phrase));
      const highMatches = highPhrases.filter((phrase) => normalized.includes(phrase));
      const inputTokens = tokens(text);
      const matches = protocols.map((protocol) => ({ protocol, score: scoreProtocol(inputTokens, protocol) }))
        .filter((entry) => entry.score >= 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ protocol, score }) => ({ protocol, score: Number(score.toFixed(1)) }));
      const emergency = criticalMatches.length > 0;
      const risk = emergency ? "CRITICAL" : highMatches.length ? "HIGH" : matches[0]?.protocol?.sev?.toUpperCase() ?? "UNDETERMINED";
      return {
        risk,
        redFlags: [...criticalMatches, ...highMatches],
        emergencyInstructions: emergency ? [
          "Call 112 now.",
          "Keep the person in a safe position and monitor breathing.",
          "Do not give food, drink, or medication unless an approved protocol specifically instructs it.",
          "Follow dispatcher instructions until help arrives."
        ] : [],
        protocolMatches: matches,
        disclaimer: "This is deterministic warning-sign and protocol matching, not a diagnosis."
      };
    }
  };
}

