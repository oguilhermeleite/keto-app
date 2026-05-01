// Hiro API — Ordinals, Runes e BRC-20 na rede Bitcoin
const { fetchWithTimeout } = require('./fetch-timeout');

async function getBitcoinAssets(address) {
  const result = { inscriptions: [], runes: [], brc20: [], errors: [] };

  // Busca em paralelo mas isola erros
  const [insResult, runeResult, brcResult] = await Promise.allSettled([
    getInscriptions(address),
    getRuneBalances(address),
    getBrc20Balances(address),
  ]);

  if (insResult.status === 'fulfilled') {
    result.inscriptions = insResult.value;
  } else {
    result.errors.push({ source: 'inscriptions', error: insResult.reason?.message });
  }

  if (runeResult.status === 'fulfilled') {
    result.runes = runeResult.value;
  } else {
    result.errors.push({ source: 'runes', error: runeResult.reason?.message });
  }

  if (brcResult.status === 'fulfilled') {
    result.brc20 = brcResult.value;
  } else {
    result.errors.push({ source: 'brc20', error: brcResult.reason?.message });
  }

  return result;
}

async function getInscriptions(address) {
  const url = `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=100`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.HIRO_API_KEY) headers['x-api-key'] = process.env.HIRO_API_KEY;

  const res = await fetchWithTimeout(url, { headers }, 10000);
  if (!res.ok) {
    throw new Error(`Hiro inscriptions ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();

  return (data.results || []).map(ins => ({
    chain: 'bitcoin',
    contract: ins.id,
    tokenId: ins.number?.toString() || ins.id,
    name: ins.meta?.name || `Inscription #${ins.number}`,
    collection: ins.meta?.collection_name || 'Ordinals',
    image: ins.content_type?.startsWith('image/')
      ? `https://api.hiro.so/ordinals/v1/inscriptions/${ins.id}/content`
      : (ins.content_type?.startsWith('text/') ? null : null),
    contentType: ins.content_type,
    inscriptionNumber: ins.number,
    isOrdinal: true,
  }));
}

async function getRuneBalances(address) {
  const url = `https://api.hiro.so/runes/v1/addresses/${address}/balances?limit=100`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.HIRO_API_KEY) headers['x-api-key'] = process.env.HIRO_API_KEY;

  const res = await fetchWithTimeout(url, { headers }, 10000);
  if (!res.ok) {
    throw new Error(`Hiro runes ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();

  return (data.results || [])
    .filter(r => r.balance && Number(r.balance) > 0)
    .map(r => {
      const divisibility = r.rune?.divisibility || 0;
      const amount = Number(r.balance) / Math.pow(10, divisibility);
      return {
        chain: 'bitcoin',
        contract: r.rune?.id,
        symbol: r.rune?.spaced_name?.split('•').join('') || r.rune?.name || '?',
        name: r.rune?.spaced_name || r.rune?.name || 'Unknown Rune',
        amount,
        valueBRL: 0,
        valueUSD: 0,
        priceBRL: 0,
        priceUSD: 0,
        change24h: 0,
        logo: null,
        isRune: true,
      };
    });
}

async function getBrc20Balances(address) {
  const url = `https://api.hiro.so/ordinals/v1/brc-20/balances/${address}?limit=100`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.HIRO_API_KEY) headers['x-api-key'] = process.env.HIRO_API_KEY;

  const res = await fetchWithTimeout(url, { headers }, 10000);
  if (!res.ok) {
    throw new Error(`Hiro brc20 ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();

  return (data.results || [])
    .filter(b => b.balance && Number(b.balance) > 0)
    .map(b => {
      const amount = Number(b.balance);
      return {
        chain: 'bitcoin',
        contract: b.ticker,
        symbol: b.ticker,
        name: b.ticker,
        amount,
        valueBRL: 0,
        valueUSD: 0,
        priceBRL: 0,
        priceUSD: 0,
        change24h: 0,
        logo: null,
        isBrc20: true,
      };
    });
}

module.exports = { getBitcoinAssets };
