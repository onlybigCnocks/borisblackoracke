import { afterEach, expect, it, vi } from "vitest";
import { apiRemoveWatchlist } from "./auth";
import { watchKind, watchRequest } from "./watchlist";
it.each([
 "http://github.com/owner/repo", "https://github.com/owner/../repo", "owner/re..po", "../repo", "owner/..",
 "https://github.com/owner/repo?tab=readme", "owner/repo#main", "owner/repo/tree/main", "owner//repo", "owner/repo//",
 "https://github.com.evil/owner/repo", "https://user@github.com/owner/repo", "https://github.com:443/owner/repo", "owner/%2e%2e",
])("rejects noncanonical repository target %s", target => { expect(watchKind(target)).toBeUndefined(); });
it.each(["owner/repo", "https://github.com/owner/repo", "https://github.com/Owner/repo.git/", "owner/repo-name_v1.2", " owner/repo "])("accepts backend repository syntax %s", target => { expect(watchKind(target)).toBe("repo"); });
it("recognizes an exact EVM address, not an address URL", () => {
 expect(watchKind("0x" + "a".repeat(40))).toBe("contract");
 expect(watchKind("https://example.com/0x" + "a".repeat(40))).toBeUndefined();
});
it.each([{ watchlist: [null], events: [] }, { watchlist: [], events: [null] }, { watchlist: [{ id: 1 }], events: [] }])("rejects malformed monitoring rows", async body => {
 localStorage.setItem("boris_auth_token", "test-only");
 vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
 await expect(watchRequest("GET")).rejects.toThrow();
});

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it.each([{ status: 403, body: { detail: "Denied" } }, { status: 200, body: { ok: false } }])("refuses unsuccessful watchlist deletion ($status)", async ({ status, body }) => {
  localStorage.setItem("boris_auth_token", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
  await expect(apiRemoveWatchlist(7)).rejects.toThrow();
});
