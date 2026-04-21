const { fetchWithTimeout } = require('./fetch-timeout');

const priceCache = new Map();
const CACHE_TTL = 120 * 1000;

async function getPrices(coinIds) {
  if (!coinIds || coinIds.length === 0) return {};
  const ids = [...new Set(coinIds)].join(',');
  const cacheKey = `prices:${ids}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl,usd&include_24hr_change=true`;
  const headers = {};
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  try {
    const res = await fetchWithTimeout(url, { headers }, 5000);
    if (!res.ok) {
      // Se estourou rate limit, retorna cache antigo se tiver
      if (cached) return cached.data;
      throw new Error(`CoinGecko error: ${res.status}`);
    }
    const data = await res.json();
    priceCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    // Fallback: se tiver cache antigo (mesmo expirado), usa
    if (cached) {
      console.warn('CoinGecko failed, using stale cache:', err.message);
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
};

module.exports = { getPrices, SYMBOL_TO_CG };
