type RescanVersion = {kind?: string; cls?: string; confidence?: number; severity?: string; path?: string | null;
  line?: number; secret_full?: string | null; secret_masked?: string | null; state?: string; commit?: string; engine?: string;
  publication_key?: string; published_at?: string; finding_id?: number; ordinal?: number};
type VersionsPage = {total: number; offset: number; limit: number; has_more: boolean};
/** API insertion order, with permission filtering before count/page. */
export function OspecRescanVersions({versions, page, onPage, rank, isRu}: {versions?: RescanVersion[]; page?: VersionsPage; onPage?: (offset: number) => void; rank: number; isRu: boolean}) {
  // Defense in depth for tier downgrade/history snapshots: never render non-REAL versions below BLACKBOX.
  const visible = (Array.isArray(versions) ? versions : []).filter(v => rank >= 3 || v.cls === "REAL");
  const validPage = page && [page.total, page.offset, page.limit].every(n => Number.isSafeInteger(n) && n >= 0) && page.limit > 0 && typeof page.has_more === "boolean" && visible.length === (versions?.length || 0) ? page : undefined;
  return <section aria-label="OSPEC rescan versions" className="mt-2 rounded-lg border border-amber-500/30 p-3 space-y-2 break-all">
    <h4 className="font-bold text-amber-300">{isRu ? "Версии находки повторного сканирования" : "Rescan finding versions"}</h4>
    <p className="text-muted-foreground">{isRu ? "Текущая строка — эффективная проекция API; публикации добавляются отдельно. Последняя возвращённая версия не гарантированно текущая относительно upstream." : "The current row is the API effective projection; publications are additive. Latest returned is not guaranteed current against upstream."}</p>
    {validPage ? <div className="flex flex-wrap items-center gap-3">
      <p>{isRu ? "Версии" : "Versions"} {visible.length ? validPage.offset + 1 : 0}–{Math.min(validPage.total, validPage.offset + visible.length)} {isRu ? "из" : "of"} {validPage.total}</p>
      {onPage && <><button type="button" className="rounded border border-border px-2 py-1 disabled:opacity-40" disabled={validPage.offset === 0} onClick={() => onPage(Math.max(0, validPage.offset - validPage.limit))}>{isRu ? "Предыдущие версии" : "Previous versions"}</button>
      <button type="button" className="rounded border border-border px-2 py-1 disabled:opacity-40" disabled={!validPage.has_more} onClick={() => onPage(validPage.offset + validPage.limit)}>{isRu ? "Следующие версии" : "Next versions"}</button></>}
    </div> : <p>{isRu ? "Полнота истории UNKNOWN; требуется свежий запрос." : "History completeness UNKNOWN; refresh required."}</p>}
    {visible.length === 0 ? <p>{isRu ? "UNKNOWN — доступные версии не возвращены." : "UNKNOWN — no accessible publication versions returned."}</p> : visible.map((v, index) => <div key={`${v.commit}:${v.engine}:${index}`} className="border-t border-border pt-2 space-y-1">
      <p className="font-bold">{index === 0 ? (isRu ? "Последняя возвращённая версия публикации" : "Latest returned publication version") : (isRu ? "Предыдущая возвращённая версия" : "Earlier returned publication version")}</p>
      <p>{v.kind || "UNKNOWN"} · {v.cls || "UNKNOWN"} · {v.severity || "UNKNOWN"} · {isRu ? "Состояние публикации" : "Publication state"}: {v.state || "UNKNOWN"} · {isRu ? "Уверенность" : "Confidence"}: {typeof v.confidence === "number" ? v.confidence : "—"}</p>
      <p>Publication: {v.publication_key || "UNKNOWN"} · {isRu ? "Опубликовано" : "Published"}: {v.published_at || "UNKNOWN"}</p>
      <p>Commit: {v.commit || "UNKNOWN"} · Engine: {v.engine || "UNKNOWN"}</p>
      <p>{rank >= 2 ? `${v.path || "UNKNOWN"}${v.line ? `:${v.line}` : ""}` : (isRu ? "Путь скрыт (RAW+)" : "Path hidden (RAW+)")}</p>
      {rank >= 3 ? <p>{isRu ? "Секрет версии" : "Version secret"}: {v.secret_full ? <code className="select-all text-primary">{v.secret_full}</code> : (isRu ? "Не возвращён" : "Not returned")}</p> : rank === 2 && typeof v.secret_masked === "string" ? <p>{isRu ? "Маска версии" : "Version masked preview"}: {v.secret_masked || (isRu ? "Не возвращена" : "Not returned")}</p> : <p>{isRu ? "Секрет скрыт (BLACKBOX). Маска отсутствует в API версий." : "Secret hidden (BLACKBOX). No masked preview in API versions."}</p>}
    </div>)}
  </section>;
}
