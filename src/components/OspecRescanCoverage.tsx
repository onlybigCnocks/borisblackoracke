import { useId, useState } from "react";

type Coverage = {
  status?: string;
  publication_key?: string; commit?: string; engine?: string; published_at?: string;
  coverage?: { complete?: boolean; required?: number | null; succeeded?: number | null; eligible?: number | null;
    states?: Record<string, number> | null;
    finalization?: {required?: number | null; succeeded?: number | null; failed?: number | null; pending?: number | null} | null };
};
type FindingCoverage = { repo_url?: string; rescan?: Coverage | null };
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? String(value) : "—";
const verdict = (r?: Coverage | null) => r?.status === "complete" && r.coverage?.complete === true ? "complete"
  : r?.status === "partial" || r?.status === "failed" || (r?.status === "complete" && r.coverage?.complete === false) ? "incomplete" : "unknown";

/** Publication coverage only: never infer queue state, freshness or credential validity. */
export function OspecRescanCoverage({ findings, repoCoverage, isRu }: {findings?: FindingCoverage[]; repoCoverage?: Record<string, Coverage | null>; isRu: boolean}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const repos = new Map<string, Coverage | null | undefined>(Object.entries(repoCoverage || {}));
  for (const finding of findings || []) if (finding.repo_url && !repos.has(finding.repo_url)) repos.set(finding.repo_url, finding.rescan);
  const entries = [...repos];
  const totals = { complete: 0, incomplete: 0, unknown: 0 };
  entries.forEach(([,r]) => totals[verdict(r)]++);
  const labels = isRu ? {complete:"Завершено",incomplete:"Неполное",unknown:"Нет данных"} : {complete:"Complete",incomplete:"Incomplete",unknown:"No data"};
  return <section aria-label={isRu ? "Покрытие OSPEC" : "OSPEC rescan coverage"} className="rounded-xl border border-border bg-card p-3 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p><strong>{isRu ? "Покрытие OSPEC" : "OSPEC coverage"}</strong><span className="text-muted-foreground"> · {isRu ? "Завершено" : "Complete"}: {totals.complete} · {isRu ? "Неполных" : "Incomplete"}: {totals.incomplete} · {isRu ? "Без данных" : "No data"}: {totals.unknown}</span></p>
      {repos.size > 0 && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="rounded px-2 py-1 text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2">{expanded ? (isRu ? "Свернуть" : "Collapse") : (isRu ? "Подробнее" : "Details")}</button>}
    </div>
    {repos.size === 0 && <p className="mt-1 text-muted-foreground">{isRu ? "Данные о покрытии не получены." : "No coverage data returned."}</p>}
    {expanded && <div id={id} className="mt-3 space-y-2">
      <p className="text-muted-foreground">{isRu ? "Покрытие репозиториев этой страницы и точного запроса. Нет данных — не значит чисто или в очереди. Статический анализ не проверяет действительность ключей; публикация не гарантирует актуальность относительно исходного репозитория и текущего движка." : "Coverage for this page and the exact query. No data does not mean clean or queued. Static analysis does not verify credentials; publication does not guarantee freshness against upstream or the current engine."}</p>
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
      {entries.map(([repo,rescan]) => {
        const v = verdict(rescan), c = rescan?.coverage;
        const hasDetails = Boolean(c || rescan?.publication_key || rescan?.commit || rescan?.engine || rescan?.published_at);
        const metadata = [[isRu ? "Публикация" : "Publication",rescan?.publication_key],[isRu ? "Коммит" : "Commit",rescan?.commit],[isRu ? "Движок" : "Engine",rescan?.engine],[isRu ? "Опубликовано" : "Published",rescan?.published_at]];
        return <div key={repo} className="border-t border-border pt-2 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-1"><span className="break-all">{repo}</span><strong className={v === "complete" ? "text-emerald-500" : v === "incomplete" ? "text-amber-500" : "text-muted-foreground"}>{labels[v]}{rescan?.status === "failed" ? (isRu ? " · Ошибка" : " · Failed") : ""}</strong></div>
          {hasDetails && <details className="mt-1 text-muted-foreground">
            <summary className="cursor-pointer text-primary">{isRu ? "Технические детали" : "Technical details"}</summary>
            <div className="mt-1 space-y-1 break-all">
              {metadata.filter(([,value]) => value).map(([label,value]) => <p key={label}>{label}: {value}</p>)}
              {c && <><p>{isRu ? "Этапы" : "Stages"}: {count(c.succeeded)}/{count(c.required)} · {isRu ? "Файлы" : "Eligible files"}: {count(c.eligible)}</p>
                {c.states && <p>{isRu ? "Ожидающие этапы" : "Pending stages"}: {count(c.states.pending)} · {isRu ? "Ошибки этапов" : "Failed stages"}: {count(c.states.failed)}</p>}
                {c.finalization && <><p>{isRu ? "Слияние" : "Merge"}: {count(c.finalization.succeeded)}/{count(c.finalization.required)}</p><p>{isRu ? "Ожидающее слияние" : "Pending merge"}: {count(c.finalization.pending)} · {isRu ? "Ошибки слияния" : "Failed merge"}: {count(c.finalization.failed)}</p></>}
              </>}
            </div>
          </details>}
        </div>;
      })}
      </div>
    </div>}
  </section>;
}
