import { describe, expect, it } from "vitest";
import { bridgePublicLinks } from "./bridge-links";
const base = {chain: "near", address: "contract.near", family: "non_evm"};
const proof = {source: "wormhole", url: "https://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/main/core/base/src/constants/contracts/tokenBridge.ts", digest: "a".repeat(64), locator: "/Mainnet/Near"};
describe("public bridge navigation", () => {
  it("preserves case-sensitive non-EVM identity in source provenance", () => {
    const links = bridgePublicLinks({...base, address: "CaseSensitive", provenance: [proof]});
    expect(links).toHaveLength(1);
    expect(links[0].title).toContain("near · CaseSensitive");
    expect(links[0].href).toBe(proof.url);
  });
  it.each(["javascript:alert(1)", "http://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/x", "https://raw.githubusercontent.com.evil.test/wormhole-foundation/wormhole-sdk-ts/x", "https://u:p@raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/x", "https://raw.githubusercontent.com:444/wormhole-foundation/wormhole-sdk-ts/x"]) ("rejects unsafe source %s", url => {
    expect(bridgePublicLinks({...base, provenance: [{...proof, url}]})).toEqual([]);
  });
  it("requires captured digest and locator, and never invents an unknown explorer", () => {
    expect(bridgePublicLinks({...base, provenance: [{...proof, digest: "x"}]})).toEqual([]);
    expect(bridgePublicLinks({...base, provenance: [{...proof, locator: ""}]})).toEqual([]);
    expect(bridgePublicLinks({...base, provenance: [proof, proof]})).toHaveLength(1);
  });
});
