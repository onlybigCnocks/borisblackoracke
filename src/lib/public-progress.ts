type Language = "en" | "ru";

// Display-only projection of operational metadata, never report/source content.
// Do not echo log suffixes: they may include paths, source code or credentials.
const ENGINE = "(?:slither|sliter|semgrep|sempreg|mythril|aderyn)";
const ENGINE_EVENT = new RegExp(`^(Running\\s+)?(${ENGINE})(?=$|[\\s:—-])`, "i");

function engineLabel(engine: string, lang: Language): string {
  if (/semgrep|sempreg/i.test(engine)) return lang === "ru" ? "Анализ паттернов" : "Pattern analysis";
  if (/mythril/i.test(engine)) return lang === "ru" ? "Символьный анализ" : "Symbolic analysis";
  return lang === "ru" ? "Статический анализ кода" : "Static code analysis";
}

function eventState(text: string, lang: Language): string {
  const states: Array<[RegExp, string, string]> = [
    [/^(?:failed|error|exception)\b/i, "failed", "ошибка"],
    [/^(?:timeout|timed out)\b/i, "timed out", "время ожидания истекло"],
    [/^(?:unavailable|not available|not installed|not found)\b/i, "unavailable", "недоступен"],
    [/^skipped\b/i, "skipped", "пропущен"],
    [/^(?:cancelled|canceled)\b/i, "cancelled", "отменён"],
    [/^(?:complete|completed|done|finished)\b/i, "complete", "завершён"],
    [/^(?:running|starting|started)\b/i, "running", "выполняется"],
  ];
  const match = states.find(([pattern]) => pattern.test(text.replace(/^[\s:—-]+/, "")));
  return match ? match[lang === "ru" ? 2 : 1] : "";
}

export function publicProgressEvent(value: unknown, lang: Language): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^(?:[📄🔍✅⚡📊⏳]\s*)+/u, "");
  const engine = ENGINE_EVENT.exec(text);
  if (engine) {
    const label = engineLabel(engine[2], lang);
    const state = eventState(text.slice(engine[0].length), lang)
      || (engine[1] ? (lang === "ru" ? "выполняется" : "running") : "");
    return state ? `${label} — ${state}` : label;
  }
  const stages: Array<[RegExp, string, string]> = [
    [/^(?:Cloning|Fetching|Downloading)\b/i, "Fetching source code", "Загрузка исходного кода"],
    [/^Compiling\b/i, "Compiling source code", "Компиляция исходного кода"],
    [/^(?:Analyzing|Analysis|Анализ):\s+/i, "Inspecting source file", "Проверка исходного файла"],
    [/^(?:Static analysis|Code analysis|Scanning)\b/i, "Code analysis", "Анализ кода"],
  ];
  for (const [pattern, en, ru] of stages) {
    const match = pattern.exec(text);
    if (match) {
      const label = lang === "ru" ? ru : en;
      const state = eventState(text.slice(match[0].length), lang);
      return state ? `${label} — ${state}` : label;
    }
  }
  const count = /^Found\s+(\d{1,9})\s+(files|contracts|issues|patterns)\b/i.exec(text);
  if (count) {
    const units: Record<string, string> = { files: "файлов", contracts: "контрактов", issues: "замечаний", patterns: "паттернов" };
    return lang === "ru" ? `Обнаружено ${count[1]} ${units[count[2].toLowerCase()]}` : `Found ${count[1]} ${count[2].toLowerCase()}`;
  }
  return null;
}

export function publicEngineDetail(value: unknown, lang: Language): string {
  if (typeof value !== "string") return "";
  const names = value.split(/[,/·]+/).map((name) => name.trim());
  const exactEngine = new RegExp(`^${ENGINE}$`, "i");
  if (names.every((name) => exactEngine.test(name))) {
    return [...new Set(names.map((name) => engineLabel(name, lang)))].join(" · ");
  }
  return publicProgressEvent(value, lang) || (lang === "ru" ? "Детали анализа недоступны" : "Analysis details unavailable");
}

export function publicProgressStep(value: unknown, lang: Language): string {
  const legacySteps: Record<string, string> = {
    "⏳ Waiting in queue...": "queued", "⏳ Ожидание в очереди...": "queued",
    "📦 Fetching source code...": "cloning", "📦 Загрузка исходного кода...": "cloning",
    "🔍 Static analysis": "static_analysis", "🔍 Статический анализ": "static_analysis",
    "✅ Complete": "done", "✅ Завершено": "done",
  };
  if (typeof value === "string") value = legacySteps[value] || value;
  const steps: Record<string, { en: string; ru: string }> = {
    queued: { en: "Waiting in queue…", ru: "Ожидание в очереди…" },
    cloning: { en: "Fetching source code…", ru: "Загрузка исходного кода…" },
    static_analysis: { en: "Static analysis", ru: "Статический анализ" },
    done: { en: "Complete", ru: "Завершено" },
  };
  return (typeof value === "string" && steps[value]?.[lang]) || publicProgressEvent(value, lang) || (lang === "ru" ? "Анализ…" : "Analyzing…");
}
