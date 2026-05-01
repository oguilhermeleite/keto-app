const { fetchWithTimeout } = require('./fetch-timeout');

const priceCache = new Map();
const CACHE_TTL = 120 * 1000;

async function getPrices(coinIds) {
  if (!coinIds || coinIds.length === 0) return {};
  const ids = [...new Set(coinIds)].filter(Boolean).join(',');
  const cacheKey = `prices:${ids}`;
  const cached = priceCache.get(cacheKey);

  // Se o cache é bem recente (60s), retorna direto
  if (cached && Date.now() - cached.ts < 60 * 1000) return cached.data;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl,usd&include_24hr_change=true`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  try {
    const res = await fetchWithTimeout(url, { headers }, 5000);

    if (!res.ok) {
      // Se deu erro (ex: 429), tenta usar cache mesmo que velho
      if (cached) {
        console.warn(`CoinGecko ${res.status}, using stale cache for ${ids}`);
        return cached.data;
      }
      throw new Error(`CoinGecko error: ${res.status}`);
    }

    const data = await res.json();
    // Se a API retornar objeto vazio por algum motivo, não mata o cache
    if (Object.keys(data).length === 0 && cached) return cached.data;

    priceCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    if (cached) {
      console.warn(`CoinGecko fetch failed, using stale cache: ${err.message}`);
      return cached.data;
    }
    throw err;
  }
}

const SYMBOL_TO_CG = {
  ETH: 'ethereum', BTC: 'bitcoin', SOL: 'solana',
  MATIC: 'matic-network', POL: 'matic-network',
  USDC: 'usd-coin', USDT: 'tether',
  ARB: 'arbitrum', OP: 'optimism',
  AERO: 'aerodrome-finance', LINK: 'chainlink',
  UNI: 'uniswap', AAVE: 'aave', WETH: 'weth',
  DAI: 'dai', WBTC: 'wrapped-bitcoin',
  BNB: 'binancecoin', AVAX: 'avalanche-2',
  RENDER: 'render-token', JUP: 'jupiter-exchange-solana',
  PYTH: 'pyth-network', BONK: 'bonk', WIF: 'dogwifcoin',
};

module.exports = { getPrices, SYMBOL_TO_CG };
