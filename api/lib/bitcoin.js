const { getPrices } = require('./prices');
const { getBitcoinAssets } = require('./hiro');
const { fetchWithTimeout } = require('./fetch-timeout');

async function getBitcoinPortfolio(address) {
  const [addrData, btcAssets] = await Promise.all([
    fetchWithTimeout(`https://blockstream.info/api/address/${address}`, {}, 8000).then(r => r.json()),
    getBitcoinAssets(address).catch(e => ({ inscriptions: [], runes: [], brc20: [], errors: [{ source: 'hiro-fatal', error: e.message }] })),
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

  // Combina Runes e BRC-20 como tokens
  const tokens = [
    ...(btcAssets.runes || []),
    ...(btcAssets.brc20 || []),
  ];

  return {
    chain: 'bitcoin',
    address,
    native,
    tokens,
    nfts: btcAssets.inscriptions || [],
    debug: {
      hiroErrors: btcAssets.errors || [],
      runesCount: (btcAssets.runes || []).length,
      brc20Count: (btcAssets.brc20 || []).length,
      inscriptionsCount: (btcAssets.inscriptions || []).length,
    },
  };
}

module.exports = { getBitcoinPortfolio };
