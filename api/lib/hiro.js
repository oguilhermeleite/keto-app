// Hiro API — Ordinals e Runes na rede Bitcoin
// Docs: https://docs.hiro.so/bitcoin

async function getOrdinalsAndRunes(address) {
  try {
    const [inscriptions, runes] = await Promise.all([
      getInscriptions(address),
      getRuneBalances(address),
    ]);
    return { inscriptions, runes };
  } catch (e) {
    console.error('Hiro error:', e.message);
    return { inscriptions: [], runes: [] };
  }
}

async function getInscriptions(address) {
  const url = `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=20`;
  const res = await fetch(url, { headers: { 'x-api-key': process.env.HIRO_API_KEY || '' } });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map(ins => ({
    chain: 'bitcoin',
    contract: ins.id,
    tokenId: ins.number?.toString(),
    name: ins.meta?.name || `Inscription #${ins.number}`,
    collection: ins.meta?.collection_name || 'Ordinals',
    image: ins.content_type?.startsWith('image/')
      ? `https://api.hiro.so/ordinals/v1/inscriptions/${ins.id}/content`
      : null,
    contentType: ins.content_type,
    inscriptionNumber: ins.number,
    isOrdinal: true,
  }));
}

async function getRuneBalances(address) {
  const url = `https://api.hiro.so/runes/v1/addresses/${address}/balances`;
  const res = await fetch(url, { headers: { 'x-api-key': process.env.HIRO_API_KEY || '' } });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map(r => ({
    chain: 'bitcoin',
    contract: r.rune?.id,
    symbol: r.rune?.spaced_name?.split('•').join('') || r.rune?.name,
    name: r.rune?.spaced_name || r.rune?.name,
    amount: Number(r.total_balance) / Math.pow(10, r.rune?.divisibility || 0),
    valueBRL: 0,
    valueUSD: 0,
    priceBRL: 0,
    priceUSD: 0,
    change24h: 0,
    logo: null,
    isRune: true,
  }));
}

module.exports = { getOrdinalsAndRunes };
