export const MODULES = [
  { icon: "🔗", name: "On-Chain Structural Analysis", nameRu: "On-Chain структурный анализ", points: ["Proxy resolution (ERC1967, UUPS, Transparent, custom)", "Implementation discovery & upgrade surface", "Storage layout inspection & collision detection", "Privileged role extraction & distribution mapping", "Multi-contract linkage (factory/router/vault/token)"], pointsRu: ["Резолвинг прокси (ERC1967, UUPS, Transparent, custom)", "Обнаружение имплементации и поверхности апгрейда", "Инспекция storage layout и детекция коллизий", "Извлечение привилегированных ролей и маппинг распределения", "Связка мульти-контрактов (factory/router/vault/token)"] },
  { icon: "🔍", name: "Static Code Analysis", nameRu: "Статический анализ кода", points: ["Slither/Aderyn signature integration", "Custom risk taxonomy (C/H/M/L)", "Delegatecall & arbitrary call surface", "Reentrancy, unchecked transfer, oracle dependency", "Emergency drain & hidden backdoor signatures"], pointsRu: ["Интеграция сигнатур Slither/Aderyn", "Кастомная таксономия рисков (C/H/M/L)", "Поверхность delegatecall и произвольных вызовов", "Reentrancy, непроверенные трансферы, зависимость от оракула", "Сигнатуры emergency drain и скрытых бэкдоров"] },
  { icon: "🧬", name: "Archetype Normalization", nameRu: "Нормализация архетипов", points: ["Stablecoin normalization (blacklist/mint/freeze)", "DEX & LP pair normalization", "Governance & liquid staking normalization", "Factory-driven architecture context", "Reduces false positives via architectural context"], pointsRu: ["Нормализация стейблкоинов (blacklist/mint/freeze)", "Нормализация DEX и LP пар", "Нормализация governance и liquid staking", "Контекст фабричной архитектуры", "Снижение false positives через архитектурный контекст"] },
  { icon: "💥", name: "Exploit Chain Modeling", nameRu: "Моделирование exploit-цепочек", points: ["Prerequisite-based scenario modeling", "Multi-step exploit chain construction", "Flash-loan & governance capture chains", "Oracle manipulation & storage corruption", "Context amplifiers (liquidity, concentration, role density)"], pointsRu: ["Моделирование сценариев на основе предпосылок", "Построение многошаговых exploit-цепочек", "Flash-loan и цепочки захвата governance", "Манипуляция оракулами и повреждение storage", "Контекстные усилители (ликвидность, концентрация, плотность ролей)"] },
  { icon: "📊", name: "Market Layer", nameRu: "Рыночный слой", points: ["DEX pool aggregation & liquidity depth", "Volume/liquidity ratio analysis", "CEX presence & pool fragmentation", "Cyclic transaction detection & flow manipulation", "Organic activity estimation & peak index"], pointsRu: ["Агрегация DEX пулов и глубина ликвидности", "Анализ ratio объём/ликвидность", "Присутствие на CEX и фрагментация пулов", "Детекция циклических транзакций", "Оценка органической активности и пиковый индекс"] },
  { icon: "👥", name: "Holder Model", nameRu: "Модель холдеров", points: ["Holder distribution & Top10 concentration", "Real concentration correction (pools/CEX normalized)", "Whale & contract holder classification", "LP concentration & proxy holder detection", "Governance concentration heuristics"], pointsRu: ["Распределение холдеров и Top10 концентрация", "Коррекция реальной концентрации (пулы/CEX нормализованы)", "Классификация китов и контрактных холдеров", "Концентрация LP и детекция прокси-холдеров", "Эвристики концентрации governance"] },
  { icon: "🤝", name: "Trust Model Extraction", nameRu: "Извлечение модели доверия", points: ["Explicit trust assumption mapping", "Role-dependency & external assumption detection", "Governance override surface analysis", "Emergency privilege exposure", "Trust failure consequence modeling"], pointsRu: ["Маппинг явных допущений доверия", "Детекция ролевых зависимостей и внешних допущений", "Анализ поверхности override governance", "Экспозиция аварийных привилегий", "Моделирование последствий нарушения доверия"] },
  { icon: "🧩", name: "ABI-Surface Intelligence", nameRu: "ABI-Surface Intelligence", points: ["Privileged function & payable surface extraction", "Fallback/receive detection", "State-changing vs view mapping", "Function density profiling", "Cross-contract callable surface mapping"], pointsRu: ["Извлечение привилегированных и payable функций", "Детекция fallback/receive", "Маппинг state-changing vs view", "Профилирование плотности функций", "Маппинг поверхности кросс-контрактных вызовов"] },
  { icon: "🔄", name: "Behavioral Layer", nameRu: "Поведенческий слой", points: ["Cyclic swap & concentrated trader detection", "Flow clustering & suspicious repetition", "Temporal activity spike analysis", "Liquidity event correlation", "Trader dominance scoring"], pointsRu: ["Детекция циклических свопов и концентрированных трейдеров", "Кластеризация потоков и подозрительные повторения", "Анализ временных всплесков активности", "Корреляция событий ликвидности", "Скоринг доминирования трейдеров"] },
  { icon: "📋", name: "Audit Drift Analysis", nameRu: "Анализ аудит-дрифта", points: ["Repo vs deployed bytecode divergence", "Severity & prerequisite drift tracking", "Governance mutation detection", "Structural surface expansion", "Alignment density calculation"], pointsRu: ["Расхождение репо и задеплоенного байткода", "Отслеживание дрифта severity и предпосылок", "Детекция мутаций governance", "Расширение структурной поверхности", "Расчёт плотности alignment"] },
  { icon: "🧪", name: "Simulation Correlation", nameRu: "Корреляция симуляций", points: ["Attacker mock & scenario graph extraction", "Transition graph parsing (deposit→vote→withdraw)", "Declared vs observed prerequisite matching", "Alignment index & partial alignment", "Undocumented surface detection"], pointsRu: ["Извлечение графов сценариев атакующего", "Парсинг графов переходов (deposit→vote→withdraw)", "Сопоставление заявленных и наблюдаемых предпосылок", "Индекс alignment и частичный alignment", "Детекция недокументированной поверхности"] },
  { icon: "📐", name: "Structural Profiling", nameRu: "Структурное профилирование", points: ["Governance, code density, liquidity risk indices", "Holder concentration index", "Composite structural profile", "Density-based surface classification", "Architectural complexity scoring"], pointsRu: ["Индексы governance, плотности кода, риска ликвидности", "Индекс концентрации холдеров", "Композитный структурный профиль", "Классификация поверхности на основе плотности", "Скоринг архитектурной сложности"] },
  { icon: "🏛️", name: "Governance Intelligence", nameRu: "Governance Intelligence", points: ["Arbitrary execution surface detection", "Proposal execution & snapshot absence", "Flash-loan governance vector detection", "Role mutation & upgrade authority mapping", "Proxy implementation transparency check"], pointsRu: ["Детекция поверхности произвольного исполнения", "Исполнение пропозалов и отсутствие snapshot", "Детекция вектора flash-loan governance", "Маппинг мутации ролей и полномочий на апгрейд", "Проверка прозрачности имплементации прокси"] },
  { icon: "🗺️", name: "Deployment Graph", nameRu: "Граф деплоя", points: ["Multi-contract deployment mapping", "Factory lineage & proxy-to-logic mapping", "Cross-address relationship hints", "Contract classification", "Chain-specific deployment mapping"], pointsRu: ["Маппинг мульти-контрактного деплоя", "Линейка factory и маппинг proxy-to-logic", "Подсказки кросс-адресных связей", "Классификация контрактов", "Маппинг деплоя по чейнам"] },
  { icon: "⚡", name: "Cross-Layer Correlation", nameRu: "Кросс-слойная корреляция", points: ["Static ↔ On-chain correlation", "Scenario ↔ Findings correlation", "Liquidity ↔ Oracle dependency", "Holder ↔ Governance correlation", "Behavioral ↔ Structural amplification"], pointsRu: ["Static ↔ On-chain корреляция", "Сценарий ↔ Findings корреляция", "Ликвидность ↔ Зависимость от оракула", "Холдеры ↔ Governance корреляция", "Поведение ↔ Структурная амплификация"] },
  { icon: "⏱️", name: "Temporal Tracking", nameRu: "Темпоральное отслеживание", points: ["Role delta & proxy upgrade tracking", "Storage layout diff detection", "Holder concentration drift", "Liquidity migration detection", "Structural index drift over time"], pointsRu: ["Дельта ролей и отслеживание апгрейдов прокси", "Детекция diff storage layout", "Дрифт концентрации холдеров", "Детекция миграции ликвидности", "Дрифт структурных индексов во времени"] },
  { icon: "📈", name: "Derivatives Intelligence", nameRu: "Деривативная разведка", points: ["OI aggregation (Binance, Bybit, OKX) & velocity", "OI vs price/volume/mcap divergence", "Synthetic leverage & crowding estimation", "Funding rate & long/short positioning", "Liquidation risk modeling & aggressor flow"], pointsRu: ["Агрегация OI (Binance, Bybit, OKX) и velocity", "Дивергенция OI vs цена/объём/mcap", "Оценка синтетического плеча и скученности", "Funding rate и позиционирование long/short", "Моделирование риска ликвидаций и aggressor flow"] },
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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
};
