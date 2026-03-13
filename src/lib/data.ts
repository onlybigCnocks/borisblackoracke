export const MODULES = [
  {
    icon: "🔍",
    name: "Multi-Language Static Analysis",
    nameRu: "Мультиязычный статический анализ",
    points: [
      "12 language backends: Solidity, Vyper, Rust, Move, Go, Python, TypeScript, Java, C++, Elixir, Shell, TON",
      "External tools: Slither, Mythril, Aderyn, Semgrep",
      "500+ vulnerability detectors with contextual severity",
      "Test/mock detection — no false positives from test code",
    ],
    pointsRu: [
      "12 языковых бэкендов: Solidity, Vyper, Rust, Move, Go, Python, TypeScript, Java, C++, Elixir, Shell, TON",
      "Внешние тулзы: Slither, Mythril, Aderyn, Semgrep",
      "500+ детекторов уязвимостей с контекстной severity",
      "Детекция тестов/моков — без false positives из тестового кода",
    ],
  },
  {
    icon: "🔗",
    name: "Invariant Correlation Engine",
    nameRu: "Корреляционный движок инвариантов",
    points: [
      "Links individual findings into multi-step exploit paths",
      "Flash loan + governance, proxy hijack, rug pull patterns",
      "Delegatecall injection, reentrancy + oracle combinations",
      "Computes correlated risk score with amplification multipliers",
    ],
    pointsRu: [
      "Связывает отдельные находки в многошаговые exploit paths",
      "Flash loan + governance, proxy hijack, rug pull паттерны",
      "Delegatecall injection, reentrancy + oracle комбинации",
      "Считает correlated risk score с множителями усиления",
    ],
  },
  {
    icon: "🏗️",
    name: "Project Archetype Normalization",
    nameRu: "Нормализация архетипа проекта",
    points: [
      "Classifies project: DEX, Lending, Bridge, DAO, NFT, Token",
      "Adjusts severity thresholds per archetype",
      "CRITICAL for a bridge may be LOW for a governance token",
      "Trust model extraction: DAO vs centralized vs unknown",
    ],
    pointsRu: [
      "Классифицирует проект: DEX, Lending, Bridge, DAO, NFT, Token",
      "Подстраивает пороги severity под архетип",
      "CRITICAL для моста может быть LOW для governance токена",
      "Извлечение trust model: DAO vs централизованный vs unknown",
    ],
  },
  {
    icon: "🎭",
    name: "Threat Scenario Analyzer",
    nameRu: "Анализатор сценариев атак",
    points: [
      "Finds attack simulations in repo (Foundry tests, PoC exploits)",
      "Matches scenarios with actual scanner findings",
      "Evaluates threat modeling maturity of project",
      "Maps structural overlap between mocks and vulnerabilities",
    ],
    pointsRu: [
      "Находит атакующие симуляции в репо (Foundry тесты, PoC эксплойты)",
      "Сопоставляет сценарии с реальными находками сканера",
      "Оценивает зрелость threat modeling проекта",
      "Маппит структурное пересечение моков и уязвимостей",
    ],
  },
  {
    icon: "📋",
    name: "Audit Drift Analyzer",
    nameRu: "Анализатор дрифта аудитов",
    points: [
      "Parses audit PDFs (Trail of Bits, OZ, Cyfrin, etc.)",
      "Extracts findings, compares with current scan",
      "Git drift: what code changed since last audit",
      "Detects unaudited new code and resolved/unresolved issues",
    ],
    pointsRu: [
      "Парсит PDF аудитов (Trail of Bits, OZ, Cyfrin и др.)",
      "Извлекает findings, сравнивает с текущим сканом",
      "Git drift: какой код изменился с последнего аудита",
      "Детектит неаудированный новый код и resolved/unresolved issues",
    ],
  },
  {
    icon: "💰",
    name: "Funds Flow Engine",
    nameRu: "Движок потоков средств",
    points: [
      "EVM (Ethereum, BSC, Polygon, Arbitrum, Base, Optimism) + Solana + Tron",
      "Wash trading, bot activity, fund withdrawal detection",
      "CEX flow analysis, timing anomalies, Sybil cluster detection",
      "HTML edge parsing for BSC/Blockscout when APIs are limited",
    ],
    pointsRu: [
      "EVM (Ethereum, BSC, Polygon, Arbitrum, Base, Optimism) + Solana + Tron",
      "Детекция wash trading, бот-активности, вывода средств",
      "Анализ CEX потоков, аномалии таймингов, детекция Sybil кластеров",
      "HTML edge parsing для BSC/Blockscout когда API ограничены",
    ],
  },
  {
    icon: "👥",
    name: "Holders & Concentration Analyzer",
    nameRu: "Анализатор холдеров и концентрации",
    points: [
      "Top holder analysis: EVM, Solana (Helius + Rugcheck), Tron",
      "Centralization scoring with whale detection",
      "Cross-check CEX/DEX listings via CoinGecko + DexScreener",
      "Burn address filtering, LP pool identification",
    ],
    pointsRu: [
      "Анализ топ-холдеров: EVM, Solana (Helius + Rugcheck), Tron",
      "Скоринг централизации с детекцией китов",
      "Перекрёстная проверка CEX/DEX листингов через CoinGecko + DexScreener",
      "Фильтрация burn-адресов, идентификация LP пулов",
    ],
  },
  {
    icon: "🔎",
    name: "Address Profiler & Deploy Graph",
    nameRu: "Профайлер адресов и граф деплоя",
    points: [
      "Deep recon: contract classification, proxy detection",
      "Creation history, activity metrics, balance analysis",
      "Deploy graph — all on-chain addresses found in repository",
      "Multi-chain auto-detection (Etherscan V2 + RPC fallback)",
    ],
    pointsRu: [
      "Глубокая разведка: классификация контрактов, proxy detection",
      "История создания, метрики активности, анализ баланса",
      "Граф деплоя — все on-chain адреса найденные в репозитории",
      "Мультичейн авто-детекция (Etherscan V2 + RPC fallback)",
    ],
  },
  {
    icon: "📈",
    name: "Market & Derivatives Engine",
    nameRu: "Движок рынков и деривативов",
    points: [
      "Futures data aggregation: Binance + OKX + Bybit",
      "OI divergence, extreme funding, liquidation cascades",
      "Taker pressure, orderbook depth, long/short imbalance",
      "Temporal analysis: velocity, acceleration, cross-scan patterns",
    ],
    pointsRu: [
      "Агрегация данных фьючерсов Binance + OKX + Bybit",
      "Дивергенция OI, экстремальный фандинг, каскады ликвидаций",
      "Давление тейкеров, глубина стакана, дисбаланс long/short",
      "Темпоральный анализ: скорость, ускорение, паттерны между сканами",
    ],
  },
  {
    icon: "📱",
    name: "Social Intelligence Scanner",
    nameRu: "Сканер социальной разведки",
    points: [
      "Telegram: Telethon deep metrics + HTML scraping + content analysis",
      "X/Twitter: engagement analysis, impersonation detection",
      "Discord: invite API + Disboard scraping + Google dorking",
      "Cross-platform correlation, scam/shill pattern detection",
    ],
    pointsRu: [
      "Telegram: Telethon deep metrics + HTML скрейпинг + контент-анализ",
      "X/Twitter: анализ engagement, детекция имперсонации",
      "Discord: invite API + Disboard скрейпинг + Google dorking",
      "Кросс-платформенная корреляция, детекция scam/shill паттернов",
    ],
  },
  {
    icon: "🛡️",
    name: "Soroban Intelligence Module",
    nameRu: "Модуль разведки Soroban",
    points: [
      "SDEX orderbook microstructure analysis (depth, spread, manipulation cost)",
      "Asset intelligence: issuer flags, trustlines, auth controls",
      "Oracle dependency mapping (Reflector and custom)",
      "Soroban contract analysis via RPC",
    ],
    pointsRu: [
      "Анализ микроструктуры ордербука SDEX (глубина, спред, стоимость манипуляции)",
      "Разведка активов: флаги эмитента, trustlines, auth controls",
      "Маппинг зависимостей от оракулов (Reflector и кастомные)",
      "Анализ контрактов Soroban через RPC",
    ],
  },
  {
    icon: "🚨",
    name: "Soroban Scam Detector",
    nameRu: "Детектор скама Soroban",
    points: [
      "Issuer clustering across multiple assets",
      "Impersonation detection (fake USDC, BTC, ETH)",
      "Scam factory patterns: one issuer mints 10+ tokens",
      "Domain reputation analysis and known scam database",
    ],
    pointsRu: [
      "Кластеризация эмитентов по множеству активов",
      "Детекция имперсонации (фейковые USDC, BTC, ETH)",
      "Паттерны scam factory: один эмитент минтит 10+ токенов",
      "Анализ репутации доменов и база известных скамов",
    ],
  },
  {
    icon: "🔐",
    name: "ZK Verifier Analyzer",
    nameRu: "Анализатор ZK верификаторов",
    points: [
      "Groth16 VK extraction from source + bytecode",
      "20+ checks: soundness (gamma==delta), frozen heart, proof malleability",
      "IC poisoning, signal overflow, pairing input truncation",
      "Tornado Cash clone detection with confidence scoring",
    ],
    pointsRu: [
      "Извлечение Groth16 VK из исходников + байткода",
      "20+ проверок: soundness (gamma==delta), frozen heart, proof malleability",
      "IC poisoning, signal overflow, pairing input truncation",
      "Детекция клонов Tornado Cash со скорингом уверенности",
    ],
  },
  {
    icon: "📐",
    name: "ZK Curve Validator",
    nameRu: "Валидатор ZK кривых",
    points: [
      "Real BN254 curve validation via py_ecc",
      "G1/G2 on-curve checks + subgroup membership",
      "Pairing sanity verification for setup integrity",
      "Dummy proof verification for broken VK detection",
    ],
    pointsRu: [
      "Реальная валидация кривой BN254 через py_ecc",
      "Проверки G1/G2 on-curve + принадлежность подгруппе",
      "Pairing sanity верификация для целостности setup",
      "Верификация dummy proof для детекции сломанных VK",
    ],
  },
  {
    icon: "🔍",
    name: "GitHub Radar",
    nameRu: "GitHub Радар",
    points: [
      "Continuous discovery of new crypto repositories",
      "GitHub token rotation for stable scanning",
      "Scoring by stars, forks, topics, and code signals",
      "Automatic vulnerability scan of top finds",
    ],
    pointsRu: [
      "Непрерывное обнаружение новых крипто-репозиториев",
      "Ротация GitHub токенов для стабильного сканирования",
      "Скоринг по stars, forks, topics и сигналам кода",
      "Автоматический скан уязвимостей топовых находок",
    ],
  },
  {
    icon: "🦙",
    name: "DeFiLlama Radar",
    nameRu: "DeFiLlama Радар",
    points: [
      "New protocol discovery via DeFiLlama API",
      "TVL tracking and protocol categorization",
      "GitHub enrichment: CoinGecko + scraping + smart search",
      "Auto-launch audit for new protocols",
    ],
    pointsRu: [
      "Обнаружение новых протоколов через DeFiLlama API",
      "Трекинг TVL и категоризация протоколов",
      "Обогащение GitHub: CoinGecko + скрейпинг + smart search",
      "Автозапуск аудита для новых протоколов",
    ],
  },
  {
    icon: "📝",
    name: "Verified Contracts Radar",
    nameRu: "Радар верифицированных контрактов",
    points: [
      "Multi-chain monitoring of newly verified contracts",
      "RPC block crawling + explorer API monitoring",
      "Junk contract filtering (test/tutorial/student)",
      "Bridge/token/protocol detection with deep analysis trigger",
    ],
    pointsRu: [
      "Мультичейн мониторинг новых верифицированных контрактов",
      "RPC block crawling + мониторинг API эксплореров",
      "Фильтрация мусорных контрактов (тест/туториал/студент)",
      "Детекция мостов/токенов/протоколов с триггером глубокого анализа",
    ],
  },
  {
    icon: "🌟",
    name: "Soroban Radar",
    nameRu: "Soroban Радар",
    points: [
      "Stellar asset watchlist with background worker",
      "Auto-discovery from trades, orderbooks, operations",
      "Drift detection between consecutive scans",
      "Alert system with configurable severity thresholds",
    ],
    pointsRu: [
      "Watchlist активов Stellar с фоновым воркером",
      "Авто-обнаружение из трейдов, ордербуков, операций",
      "Детекция дрифта между последовательными сканами",
      "Система алертов с настраиваемыми порогами severity",
    ],
  },
  {
    icon: "🔐",
    name: "ZK Radar",
    nameRu: "ZK Радар",
    points: [
      "Network-wide ZK verifier discovery on EVM chains",
      "Block crawling for pairing precompile calls (BN254)",
      "VK reuse detection and deployer graph",
      "Multi-chain parallel workers with progress tracking",
    ],
    pointsRu: [
      "Сетевое обнаружение ZK верификаторов на EVM сетях",
      "Блок-кроулинг для pairing precompile вызовов (BN254)",
      "Детекция переиспользования VK и граф деплойеров",
      "Мультичейн параллельные воркеры с трекингом прогресса",
    ],
  },
];

export interface ScanResult {
  id: string;
  target: string;
  targetType: 'github' | 'contract' | 'explorer';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  date: string;
  findings: { critical: number; high: number; medium: number; low: number };
  governance?: {
    claimed: string;
    observed: string;
    adminScore: number;
    roles: string[];
  };
  categories?: { name: string; score: number }[];
  findingsList?: Finding[];
}

export interface Finding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  file?: string;
  line?: number;
  description: string;
}

export interface MarketScan {
  id: string;
  symbol: string;
  score: number;
  level: string;
  signals: string[];
  date: string;
}

export const MOCK_SCAN: ScanResult = {
  id: "demo-001",
  target: "uniswap/v3-core",
  targetType: "github",
  riskLevel: "MEDIUM",
  date: new Date().toISOString(),
  findings: { critical: 0, high: 2, medium: 5, low: 8 },
  governance: {
    claimed: "DAO (Governance Token)",
    observed: "Timelock + 3/5 Multisig with upgrade authority",
    adminScore: 6.2,
    roles: ["owner", "admin", "upgrader", "pauser"],
  },
  categories: [
    { name: "Mechanics", score: 3.5 },
    { name: "Structure", score: 5.8 },
    { name: "Config", score: 4.2 },
    { name: "Notes", score: 2.1 },
  ],
  findingsList: [
    { id: "f1", severity: "HIGH", type: "Privileged Function", file: "src/UniswapV3Pool.sol", line: 142, description: "Owner can modify fee parameters without timelock" },
    { id: "f2", severity: "HIGH", type: "Upgrade Surface", file: "src/UniswapV3Factory.sol", line: 89, description: "Factory owner can deploy arbitrary pool implementations" },
    { id: "f3", severity: "MEDIUM", type: "Oracle Dependency", file: "src/libraries/Oracle.sol", line: 56, description: "TWAP oracle manipulation window of 30 minutes" },
    { id: "f4", severity: "MEDIUM", type: "Reentrancy", file: "src/UniswapV3Pool.sol", line: 312, description: "Potential reentrancy in flash callback" },
    { id: "f5", severity: "LOW", type: "Gas Optimization", file: "src/libraries/TickMath.sol", line: 24, description: "Redundant storage reads in tick calculation" },
  ],
};



export const WALLETS = {
  USDT_TRC20: "TPxE5mtu9uqzMD19gxXo6Vg7Z383HFLHCv",
  USDT_ERC20: "0xab62911b8f9493e0e150506077d63740680b631f",
  TON: "UQC6BVm6D2au2xNmdRN0UiuTkVLq",
  BTC: "142787bwqxWs2UsKXWEjHxZypNYUXEcCpH",
  ETH: "0xab62911b8f9493e0e150506077d63740680b631f",
};

export const TIER_PRICES = {
  guest: { monthly: 0, yearly: 0 },
  radar: { monthly: 19, yearly: 171 },
  raw: { monthly: 29, yearly: 261 },
  blackbox: { monthly: 49, yearly: 441 },
};

export const LINKS = {
  bot: "https://t.me/BlackOracleBORIS_bot",
  support: "https://t.me/GenEXEC_BORIS",
  enChannel: "https://t.me/Black_Oracle_BORIS_eng",
  ruChannel: "https://t.me/Black_Oracle_BORIS_ru",
  github: "https://github.com/BlackOracleRiskInspectorSystem/BORIS",
};
