type Coverage = {
  status?: string;
  publication_key?: string; commit?: string; engine?: string; published_at?: string;
  coverage?: { complete?: boolean; required?: number | null; succeeded?: number | null; eligible?: number | null;
    states?: Record<string, number> | null;
    finalization?: {required?: number | null; succeeded?: number | null; failed?: number | null; pending?: number | null} | null };
};
type FindingCoverage = { repo_url?: string; rescan?: Coverage | null };
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? String(value) : "—";

/** Only the final API's allowlisted operational metadata; legacy repo status is never a verdict. */
export function OspecRescanCoverage({ findings, repoCoverage, isRu }: {findings?: FindingCoverage[]; repoCoverage?: Record<string, Coverage | null>; isRu: boolean}) {
  const repos = new Map<string, Coverage | null | undefined>(Object.entries(repoCoverage || {}));
  for (const finding of findings || []) if (finding.repo_url && !repos.has(finding.repo_url)) repos.set(finding.repo_url, finding.rescan);
  return <section aria-label="OSPEC rescan coverage" className="rounded-xl border border-amber-500/40 bg-card p-4 space-y-2 font-mono text-xs">
    <h3 className="font-bold text-amber-300">{isRu ? "Покрытие повторного сканирования OSPEC" : "OSPEC rescan coverage"}</h3>
    <p className="text-muted-foreground">{isRu ? "Опубликованное покрытие точного запроса и репозиториев страницы. Отсутствие находок — не чистый вердикт." : "Published coverage for the exact repository query and findings page. Historic results and no matching findings are not a clean verdict."}</p>
    {repos.size === 0 && <p>{isRu ? "UNKNOWN — покрытие не возвращено; глобальный список и ожидание кампании не подтверждены." : "UNKNOWN — no repository coverage returned; no global inventory or pending campaign is implied."}</p>}
    {[...repos].map(([repo, rescan]) => {
      const c = rescan?.coverage;
      const state = rescan?.status;
      const verdict = state === "complete" && c?.complete === true ? "COMPLETE" : state === "partial" || state === "failed" || (state === "complete" && c?.complete === false) ? "INCOMPLETE" : "UNKNOWN";
      return <div key={repo} className="border-t border-border pt-2 break-all">
        <p><b>{repo}</b> · <strong>{verdict}</strong>{state === "failed" ? " (FAILED)" : ""}</p>
        <p>Publication: {rescan?.publication_key || "UNKNOWN"} · Commit: {rescan?.commit || "UNKNOWN"} · Engine: {rescan?.engine || "UNKNOWN"} · {isRu ? "Опубликовано" : "Published"}: {rescan?.published_at || "UNKNOWN"}</p>
        <p className="text-muted-foreground">{isRu ? "Публикация не подтверждает свежесть относительно upstream или текущего движка." : "Publication identity does not confirm freshness against upstream or the current engine."}</p>
        <p>{isRu ? "Этапы" : "Stages"}: {count(c?.succeeded)}/{count(c?.required)} · {isRu ? "Файлы" : "Eligible files"}: {count(c?.eligible)} · {isRu ? "Слияние" : "Merge"}: {count(c?.finalization?.succeeded)}/{count(c?.finalization?.required)}</p>
        <p>{isRu ? "Ожидающие этапы" : "Pending stages"}: {count(c?.states?.pending)} · {isRu ? "Ошибки этапов" : "Failed stages"}: {count(c?.states?.failed)} · {isRu ? "Ожидающее слияние" : "Pending merge"}: {count(c?.finalization?.pending)} · {isRu ? "Ошибки слияния" : "Failed merge"}: {count(c?.finalization?.failed)}</p>
        {verdict === "UNKNOWN" && <p>{isRu ? "Покрытие отсутствует или не подтверждено; состояние очереди неизвестно." : "Coverage missing or unconfirmed; queue/pending status unknown."}</p>}
        {verdict === "COMPLETE" && <p>{isRu ? "Статическое покрытие завершено; это не проверка живости и не доказательство отсутствия секретов." : "Static coverage complete; not live verification or proof of no secrets."}</p>}
      </div>;
    })}
  </section>;
}
