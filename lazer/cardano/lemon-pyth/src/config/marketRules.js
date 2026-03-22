export const BLACKLIST = [
    "ALPACAUSDT", "TORNUSDT", "SRMUSDT", "YFIIUSDT", "SNMUSDT", 
    "LUNAUSDT", "BTSUSDT", "USDCUSDT", "BUSDUSDT", "FTTUSDT", 
    "RAYUSDT", "ANTUSDT", "XMRUSDT" // XMR a veces lo deslistan, ojo
];

export const MARKET_RULES = {
    minVolume24h: 3000000, // 3 Millones mínimo para filtrar basura
    allowedQuote: 'USDT',
};

export const LOGO_OVERRIDES = {
    '1000PEPE': 'pepe',
    '1000BONK': 'bonk',
    '1000FLOKI': 'floki',
    '1000SHIB': 'shib',
    '1000LUNC': 'luna',
    '1000RATS': 'rats',
    '1000SATS': 'sats', // Agregado común
    'WIF': 'wif',
    'POPCAT': 'popcat',
    'MYRO': 'myro',
    'BRETT': 'brett',
    'MEW': 'mew',
    'TURBO': 'turbo',
    'NEIRO': 'neiro',
    'ZK': 'zk'
};