import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useDashboardTab } from "./dashboard-state";

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it("safely restores allowlisted navigation across identity and explicit URL changes", () => {
  localStorage.setItem("boris_dashboard_tab:v1:a", "radar");
  localStorage.setItem("boris_dashboard_tab:v1:b", "billing");
  const hook = renderHook(({ id, search, hash }) => useDashboardTab(id, search, hash), {
    initialProps: { id: "a", search: "?tab=tools", hash: "" },
  });
  expect(hook.result.current[0]).toBe("tools");
  act(() => hook.result.current[1]("referral"));
  expect(hook.result.current[0]).toBe("referral");
  hook.rerender({ id: "b", search: "", hash: "" });
  expect(hook.result.current[0]).toBe("billing");
  expect(localStorage.getItem("boris_dashboard_tab:v1:a")).toBe("referral");
  hook.rerender({ id: "b", search: "", hash: "#watchlist" });
  expect(hook.result.current[0]).toBe("watchlist");
  hook.rerender({ id: "b", search: "?paid_inv=existing", hash: "" });
  expect(hook.result.current[0]).toBe("billing");
  hook.unmount();
  localStorage.setItem("boris_dashboard_tab:v1:a", '{"tab":"tools","token":"bad"}');
  const invalid = renderHook(() => useDashboardTab("a", "?tab=checkout", "#javascript:alert(1)"));
  expect(invalid.result.current[0]).toBe("history");
  act(() => invalid.result.current[1]("checkout" as never));
  expect(invalid.result.current[0]).toBe("history");
});

it("works without storage permission and does not persist anonymous preferences", () => {
  const anonymous = renderHook(() => useDashboardTab(undefined, "", ""));
  act(() => anonymous.result.current[1]("tools"));
  expect(localStorage.length).toBe(0);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  const blocked = renderHook(() => useDashboardTab("a", "", ""));
  expect(blocked.result.current[0]).toBe("history");
  act(() => blocked.result.current[1]("radar"));
  expect(blocked.result.current[0]).toBe("radar");
});

it("remembers the last tab after remount, isolated by user", () => {
  const first = renderHook(() => useDashboardTab("operator-a", "", ""));
  expect(first.result.current[0]).toBe("history");
  act(() => first.result.current[1]("radar"));
  first.unmount();
  const second = renderHook(() => useDashboardTab("operator-a", "", ""));
  expect(second.result.current[0]).toBe("radar");
  const other = renderHook(() => useDashboardTab("operator-b", "", ""));
  expect(other.result.current[0]).toBe("history");
  expect(Object.values(localStorage)).not.toContain("operator-a");
});
