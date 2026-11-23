// Links are navigation, never a network scan or verification assertion.
const SOURCE_PREFIXES: Record<string, string[]> = {
  wormhole: ["https://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/"],
  llama: ["https://raw.githubusercontent.com/DefiLlama/bridges-server/"],
  layerzero: ["https://metadata.layerzero-api.com/v1/metadata"],
  hyperlane: ["https://codeload.github.com/hyperlane-xyz/hyperlane-registry/"],
  axelar: ["https://raw.githubusercontent.com/axelarnetwork/axelar-contract-deployments/"],
  cctp: ["https://developers.circle.com/cctp/"],
  optimism: ["https://raw.githubusercontent.com/ethereum-optimism/superchain-registry/"],
  arbitrum: ["https://raw.githubusercontent.com/OffchainLabs/arbitrum-sdk/"],
};
export function bridgePublicLinks(bridge: {chain: string; address: string; family?: string; provenance?: Array<{source: string; url: string; digest: string; locator?: string}>}) {
  const links: Array<{label: string; href: string; title: string}> = [];
  const seen = new Set<string>();
  for (const p of bridge.provenance || []) {
    if (!/^[0-9a-f]{64}$/.test(p.digest || "") || !p.locator || typeof p.url !== "string") continue;
    try {
      const u = new URL(p.url);
      if (u.protocol !== "https:" || u.username || u.password || u.port || !SOURCE_PREFIXES[p.source]?.some(prefix => p.url.startsWith(prefix))) continue;
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      links.push({label: `Registry source: ${p.source}`, href: p.url, title: `${bridge.chain} · ${bridge.address} · ${p.locator} · SHA256 ${p.digest}`});
    } catch { /* Invalid provenance is not a navigable URL. */ }
  }
  if (bridge.chain === "solana" && bridge.family === "non_evm" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(bridge.address) && links.length) {
    links.unshift({label: "Explorer: solana", href: `https://explorer.solana.com/address/${encodeURIComponent(bridge.address)}`, title: "Solana Mainnet explorer; not a BORIS scan"});
  }
  return links;
}
