// Jupiter Price API — cobre TODOS os tokens Solana com liquidez
// Docs: https://price.jup.ag/
// Gratuito e sem key

const { fetchWithTimeout } = require('./fetch-timeout');

const priceCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minuto (Jupiter atualiza bem)

/**
 * Busca preços USD de tokens Solana pelos mint addresses
 * @param {string[]} mints - Array de mint addresses (contract)
 * @returns {Object} { mintAddress: { price, priceChange24h } }
 */
async function getJupiterPrices(mints) {
  if (!mints || mints.length === 0) return {};

  // Jupiter aceita até 100 mints por request
  const uniqueMints = [...new Set(mints)].filter(Boolean);
  const chunks = [];
  for (let i = 0; i < uniqueMints.length; i += 100) {
    chunks.push(uniqueMints.slice(i, i + 100));
  }

  const result = {};

  await Promise.all(chunks.map(async (chunk) => {
    const cacheKey = chunk.join(',');
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      Object.assign(result, cached.data);
      return;
    }

    try {
      const url = `https://api.jup.ag/price/v2?ids=${chunk.join(',')}&showExtraInfo=true`;
      const res = await fetchWithTimeout(url, {}, 5000);
      if (!res.ok) return;

      const json = await res.json();
      const chunkResult = {};

      for (const [mint, info] of Object.entries(json.data || {})) {
        if (!info) continue;
        chunkResult[mint] = {
          price: parseFloat(info.price) || 0,
          confidence: info.extraInfo?.confidenceLevel || 'unknown',
        };
      }

      priceCache.set(cacheKey, { data: chunkResult, ts: Date.now() });
      Object.assign(result, chunkResult);
    } catch (err) {
      console.error('Jupiter price fetch failed:', err.message);
    }
  }));

  return result;
}

module.exports = { getJupiterPrices };
