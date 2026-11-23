import {afterEach, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import ToolsPanel from "./ToolsPanel";
import {OspecRescanVersions} from "./OspecRescanVersions";
import fixtures from "./fixtures/ospec-api.json";
vi.mock("react-i18next",()=>({useTranslation:()=>({i18n:{language:"en"}})}));
vi.mock("@/lib/auth",async original=>({...await original<object>(),apiGetToolHistory:async()=>[]}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();});
function expandHistory() {
 for (const b of screen.queryAllByRole("button", {name:"Finding history"})) if(b.getAttribute("aria-expanded")==="false") fireEvent.click(b);
 for (const b of screen.queryAllByRole("button", {name:"История находки"})) if(b.getAttribute("aria-expanded")==="false") fireEvent.click(b);
}
function open(tier="RAW") {
  localStorage.setItem("boris_auth_token","fixture");localStorage.setItem("boris_auth_user",JSON.stringify({tier}));
  const requests: any[]=[];
  vi.stubGlobal("fetch",vi.fn(async (url,init)=>{
    if(String(url).endsWith("/catalog"))return new Response(JSON.stringify({ok:false}));
    const body=JSON.parse(init.body);requests.push(body);
    return new Response(JSON.stringify(fixtures.pages[String(body.versions_offset||0) as "0"][tier as "RAW"]));
  }));
  render(<ToolsPanel/>);fireEvent.click(screen.getByRole("button",{name:/OSPEC \(1.1M/}));return requests;
}
it("pages versions with exact query/filters and independent offsets, resets on filter change",async()=>{

  const requests=open();
  await screen.findByRole("region",{name:"OSPEC rescan versions"});
  expandHistory();
  const input=screen.getByPlaceholderText(/Фильтр по типу секрета/);
  fireEvent.change(input,{target:{value:"org/repo"}});fireEvent.keyDown(input,{key:"Enter"});
  await screen.findByRole("region",{name:"OSPEC rescan versions"});
  expandHistory();
  const first=requests.at(-1);
  // Editing the input without searching must not change a version-page query.
  fireEvent.change(input,{target:{value:"org/not-searched"}});
  fireEvent.click(screen.getByRole("button",{name:"Next"}));
  await screen.findByRole("button",{name:"Previous"});
  expect(requests.at(-1)).toEqual({...first,versions_offset:10});
  expect(requests.at(-1).query).toBe("org/repo");
  expandHistory();
  expect(screen.getByRole("region",{name:"OSPEC rescan versions"})).toHaveTextContent("Entries 11–17 of 17");
  expect(screen.getByRole("button",{name:"Next"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Previous"}));
  await screen.findByRole("region",{name:"OSPEC rescan versions"});
  expandHistory();
  expect(requests.at(-1)).toEqual({...first,versions_offset:0});
  fireEvent.keyDown(document.body,{key:"4"});
  await screen.findByRole("region",{name:"OSPEC rescan versions"});
  expandHistory();
  expect(requests.at(-1)).toMatchObject({severity:"HIGH",versions_offset:0,offset:0});
});
it("RAW uses only API masked preview; RADAR never renders paths or previews; BLACKBOX full only",()=>{
  const version={cls:"REAL",path:"private-fixture-path",secret_full:"inert-full-value",secret_masked:"inert-mask",publication_key:"publication-fixture",published_at:"timestamp-fixture"};
  const {rerender}=render(<OspecRescanVersions versions={[version]} rank={2} isRu={false}/>);
  expandHistory();
  expect(screen.getByRole("region")).toHaveTextContent("inert-mask");
  expect(screen.getByRole("region")).not.toHaveTextContent("inert-full-value");
  rerender(<OspecRescanVersions versions={[version]} rank={1} isRu={false}/>);
  expect(screen.getByRole("region")).not.toHaveTextContent("inert-mask");
  expect(screen.getByRole("region")).not.toHaveTextContent("private-fixture-path");
  rerender(<OspecRescanVersions versions={[version]} rank={3} isRu={false}/>);
  expect(screen.getByRole("region")).toHaveTextContent("inert-full-value");
});
it("fences a version response superseded by a new filter",async()=>{
  open();await screen.findByRole("region",{name:"OSPEC rescan versions"});expandHistory();
  const finishes: ((value:Response)=>void)[]=[];
  vi.stubGlobal("fetch",vi.fn(()=>new Promise<Response>(resolve=>finishes.push(resolve))));
  fireEvent.click(screen.getByRole("button",{name:"Next"}));
  expect(screen.queryByRole("region",{name:"OSPEC rescan coverage"})).not.toBeInTheDocument();
  fireEvent.keyDown(document.body,{key:"4"});
  await act(async()=>finishes[1](new Response(JSON.stringify(fixtures.failed.RAW))));
  expect(await screen.findByRole("region",{name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
  await act(async()=>finishes[0](new Response(JSON.stringify(fixtures.complete.RAW))));
  expect(screen.getByRole("region",{name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
});
it("clears BLACKBOX publication results after a tier downgrade",async()=>{
  localStorage.setItem("boris_auth_user",JSON.stringify({tier:"BLACKBOX"}));
  vi.stubGlobal("fetch",vi.fn(async url=>new Response(JSON.stringify(String(url).endsWith("/catalog")?{ok:false}:fixtures.pages["0"].BLACKBOX))));
  const {rerender}=render(<ToolsPanel/>);fireEvent.click(screen.getByRole("button",{name:/OSPEC \(1.1M/}));
  await screen.findByRole("region",{name:"OSPEC rescan versions"});
  expandHistory();
  localStorage.setItem("boris_auth_user",JSON.stringify({tier:"RADAR"}));
  rerender(<ToolsPanel/>);
  expect(screen.queryByRole("region",{name:"OSPEC rescan coverage"})).not.toBeInTheDocument();
});
it("filtered empty exact repo retains independent coverage; empty global search never fabricates inventory",async()=>{
  localStorage.setItem("boris_auth_user",JSON.stringify({tier:"RAW"}));
  vi.stubGlobal("fetch",vi.fn(async url=>new Response(JSON.stringify(String(url).endsWith("/catalog")?{ok:false}:fixtures.filteredZero.RAW))));
  render(<ToolsPanel/>);fireEvent.click(screen.getByRole("button",{name:/OSPEC \(1.1M/}));
  expect(await screen.findByRole("region",{name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
  expect(fixtures.filteredZero.RAW.findings).toHaveLength(0);
  expect(fixtures.emptySearch.RAW.repo_coverage).not.toHaveProperty("https://github.com/org/empty");
});
it("final actual API class projection includes newer REAL and tier-filtered counts before paging",async()=>{
  expect(fixtures.currentReal.RADAR.total_groups).toBe(1);
  expect(fixtures.currentReal.RADAR.findings[0].cls).toBe("REAL");
  expect(fixtures.pages["0"].RAW.findings[0].rescan_versions_page).toEqual({total:17,offset:0,limit:10,has_more:true});
  expect(fixtures.pages["10"].RAW.findings[0].rescan_versions).toHaveLength(7);
  expect(fixtures.pages["0"].BLACKBOX.findings[0].rescan_versions_page.total).toBe(28);
  open("RADAR");
  expect(await screen.findByRole("region",{name:"OSPEC rescan versions"})).not.toHaveTextContent(".env");
});
