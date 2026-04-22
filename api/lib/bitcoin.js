const { getPrices } = require('./prices');
const { getOrdinalsAndRunes } = require('./hiro');
const { fetchWithTimeout } = require('./fetch-timeout');

async function getBitcoinPortfolio(address) {
  const [addrData, ordinalsData] = await Promise.all([
    fetchWithTimeout(`https://blockstream.info/api/address/${address}`, {}, 8000).then(r => r.json()),
    getOrdinalsAndRunes(address).catch(e => ({ inscriptions: [], runes: [], errors: [{ source: 'hiro-fatal', error: e.message }] })),
  ]);

  const funded = addrData.chain_stats.funded_txo_sum;
  const spent  = addrData.chain_stats.spent_txo_sum;
  const balanceBTC = (funded - spent) / 1e8;

  const prices = await getPrices(['bitcoin']);
  const btcPrice = prices.bitcoin || {};

  const native = {
    chain: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', isNative: true,
    amount: balanceBTC,
    logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    priceBRL: btcPrice.brl || 0,
    priceUSD: btcPrice.usd || 0,
    valueBRL: balanceBTC * (btcPrice.brl || 0),
    valueUSD: balanceBTC * (btcPrice.usd || 0),
    change24h: btcPrice.brl_24h_change || 0,
  };

  return {
    chain: 'bitcoin',
    address,
    native,
    tokens: ordinalsData.runes || [],
    nfts: ordinalsData.inscriptions || [],
    debug: {
      hiroErrors: ordinalsData.errors || [],
      runesCount: (ordinalsData.runes || []).length,
      inscriptionsCount: (ordinalsData.inscriptions || []).length,
    },
  };
}

module.exports = { getBitcoinPortfolio };
