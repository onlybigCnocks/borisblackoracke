import { useState } from "react";

type RescanVersion = {kind?: string; cls?: string; confidence?: number; severity?: string; path?: string | null;
  line?: number; secret_full?: string | null; secret_masked?: string | null; state?: string; commit?: string; engine?: string;
  publication_key?: string; published_at?: string; finding_id?: number; ordinal?: number};
type VersionsPage = {total: number; offset: number; limit: number; has_more: boolean};
/** API insertion order, with permission filtering before count/page. */
export function OspecRescanVersions({versions, page, onPage, rank, isRu}: {versions?: RescanVersion[]; page?: VersionsPage; onPage?: (offset: number) => void; rank: number; isRu: boolean}) {
  const [expanded, setExpanded] = useState<boolean | null>(null);
  // Defense in depth for tier downgrade/history snapshots: never render non-REAL versions below BLACKBOX.
  const visible = (Array.isArray(versions) ? versions : []).filter(v => rank >= 3 || v.cls === "REAL");
  const validPage = page && [page.total, page.offset, page.limit].every(n => Number.isSafeInteger(n) && n >= 0) && page.limit > 0 && typeof page.has_more === "boolean" && visible.length === (versions?.length || 0) ? page : undefined;
  if (visible.length === 0 && !(validPage && validPage.total > 0 && onPage)) return null;
  const show = expanded ?? Boolean(validPage && validPage.offset > 0 && onPage);
  return <section aria-label="OSPEC rescan versions" className="mt-2 text-xs break-all">
    <button type="button" aria-expanded={show} onClick={() => setExpanded(!show)} className="text-muted-foreground hover:text-primary">{isRu ? "История находки" : "Finding history"}</button>
    {show && <div className="space-y-2">

    {validPage ? <div className="flex flex-wrap items-center gap-3">
      <p>{isRu ? "Записи" : "Entries"} {visible.length ? validPage.offset + 1 : 0}–{Math.min(validPage.total, validPage.offset + visible.length)} {isRu ? "из" : "of"} {validPage.total}</p>
      {onPage && <><button type="button" className="rounded border border-border px-2 py-1 disabled:opacity-40" disabled={validPage.offset === 0} onClick={() => onPage(Math.max(0, validPage.offset - validPage.limit))}>{isRu ? "Назад" : "Previous"}</button>
      <button type="button" className="rounded border border-border px-2 py-1 disabled:opacity-40" disabled={!validPage.has_more} onClick={() => onPage(validPage.offset + validPage.limit)}>{isRu ? "Далее" : "Next"}</button></>}
    </div> : null}
    {visible.length === 0 ? null : visible.map((v, index) => <div key={`${v.commit}:${v.engine}:${index}`} className="border-t border-border pt-2 space-y-1">

      <p>{[v.kind, v.cls, v.severity].filter(Boolean).join(" · ")} · {isRu ? "Уверенность" : "Confidence"}: {typeof v.confidence === "number" ? v.confidence : "—"}</p>
      {v.published_at && <p>{v.published_at}</p>}

      <p>{rank >= 2 ? `${v.path || ""}${v.line ? `:${v.line}` : ""}` : (isRu ? "Путь скрыт (RAW+)" : "Path hidden (RAW+)")}</p>
      {rank >= 3 ? <p>{isRu ? "Секрет" : "Secret"}: {v.secret_full ? <code className="select-all text-primary">{v.secret_full}</code> : (isRu ? "Не возвращён" : "Not returned")}</p> : rank === 2 && typeof v.secret_masked === "string" ? <p>{isRu ? "Маска" : "Masked preview"}: {v.secret_masked || (isRu ? "Не возвращена" : "Not returned")}</p> : <p>{isRu ? "Секрет недоступен на этом тарифе." : "Secret unavailable at this tier."}</p>}
      {(v.commit || v.engine || v.publication_key) && <details><summary>{isRu ? "Технические детали" : "Technical details"}</summary>
        {v.commit && <p>{isRu ? "Коммит" : "Commit"}: {v.commit}</p>}
        {v.engine && <p>{isRu ? "Движок" : "Engine"}: {v.engine}</p>}
        {v.publication_key && <p>{isRu ? "Идентификатор" : "Identifier"}: {v.publication_key}</p>}
      </details>}
    </div>)}
    </div>}
  </section>;
}
