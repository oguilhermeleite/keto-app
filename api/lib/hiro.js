// Hiro API — Ordinals e Runes na rede Bitcoin
const { fetchWithTimeout } = require('./fetch-timeout');

async function getOrdinalsAndRunes(address) {
  const result = { inscriptions: [], runes: [], errors: [] };

  // Busca em paralelo mas isola erros
  const [insResult, runeResult] = await Promise.allSettled([
    getInscriptions(address),
    getRuneBalances(address),
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

  return result;
}

async function getInscriptions(address) {
  const url = `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=60`;
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
  const url = `https://api.hiro.so/runes/v1/addresses/${address}/balances?limit=60`;
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

module.exports = { getOrdinalsAndRunes };
