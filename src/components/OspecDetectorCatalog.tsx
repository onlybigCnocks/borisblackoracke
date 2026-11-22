export type DetectorCatalog = {
  schema: number;
  status: string;
  counts: { canonical_kinds: number; rules: number; legacy_rules: number; registry_rules: number; providers: number | null; formats: number | null };
  detectors: Array<{ kind: string; short_kind: string; label: string; aliases: string[]; status: string; coverage_status: string; role: string; test_mode?: string; pair_status?: string; verification: string; finding_counts: { real: number; suspect: number; test: number } }>;
};

export function OspecDetectorOptions({ catalog, stats, value, isRu }: { catalog: DetectorCatalog | null; stats?: Array<{ kind: string; short_kind?: string; real?: number; suspect?: number; test?: number }>; value: string; isRu: boolean }) {
  if (!catalog) return <option value={value}>{isRu ? "Каталог недоступен — ручной поиск" : "Catalog unavailable — manual search"}</option>;
  const counts = new Map<string, { real: number; suspect: number; test: number }>();
  for (const s of stats ?? []) {
    const name = s.short_kind ?? s.kind.replace(/^secret:/, "");
    const d = catalog.detectors.find(d => d.short_kind === name || d.aliases.includes(name));
    if (d) {
      const prev = counts.get(d.short_kind) ?? { real: 0, suspect: 0, test: 0 };
      counts.set(d.short_kind, { real: prev.real + (s.real ?? 0), suspect: prev.suspect + (s.suspect ?? 0), test: prev.test + (s.test ?? 0) });
    }
  }
  const canonical = catalog.detectors.find(d => d.short_kind === value || d.aliases.includes(value));
  return <>
    <option value="">{isRu ? `Все ${catalog.counts.canonical_kinds} типов детекторов` : `All ${catalog.counts.canonical_kinds} detector kinds`}</option>
    {value && !catalog.detectors.some(d => d.short_kind === value) && <option value={value}>{canonical ? `${value} → ${canonical.short_kind}` : value}</option>}
    {catalog.detectors.map(d => {
      // The GET catalog has no DB inventory. Never infer missing counts as zero.
      const c = counts.get(d.short_kind);
      return <option key={d.kind} value={d.short_kind}>
        {d.label} [{d.short_kind}] · {d.coverage_status} · role:{d.role} · test:{d.test_mode ?? "unspecified"} · pair:{d.pair_status ?? "unspecified"} · {d.verification}{c ? ` · ${c.real} REAL / ${c.suspect} SUSPECT / ${c.test} TEST` : ""}
      </option>;
    })}
  </>;
}

export function OspecCatalogSummary({ catalog, isRu }: { catalog: DetectorCatalog | null; isRu: boolean }) {
  if (!catalog) return <span>{isRu ? "Каталог детекторов: недоступен" : "Detector catalog: unavailable"}</span>;
  const c = catalog.counts;
  return <span>{isRu ? "Поддерживаемое покрытие" : "Supported scope"}: {c.canonical_kinds} {isRu ? "типов" : "kinds"} · {c.rules} {isRu ? "правил" : "rules"} ({c.legacy_rules} legacy / {c.registry_rules} registry) · {isRu ? "провайдеры" : "providers"}: {c.providers ?? "—"} · {isRu ? "форматы" : "formats"}: {c.formats ?? "—"}. {isRu ? "Не число находок. LIMITED / offline ≠ LIVE; роли и тестовый режим не подразумеваются." : "Not finding counts. LIMITED / offline ≠ LIVE; roles and test mode are not implied."}</span>;
}
