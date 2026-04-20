const { getPrices } = require('./prices');

async function getBitcoinPortfolio(address) {
  const res = await fetch(`https://blockstream.info/api/address/${address}`);
  if (!res.ok) throw new Error(`Blockstream error: ${res.status}`);
  const data = await res.json();

  const funded = data.chain_stats.funded_txo_sum;
  const spent = data.chain_stats.spent_txo_sum;
  const balanceBTC = (funded - spent) / 1e8;

  const prices = await getPrices(['bitcoin']);
  const btcPrice = prices.bitcoin || {};

  return {
    chain: 'bitcoin', address,
    native: {
      chain: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', isNative: true,
      amount: balanceBTC,
      logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      priceBRL: btcPrice.brl || 0, priceUSD: btcPrice.usd || 0,
      valueBRL: balanceBTC * (btcPrice.brl || 0),
      valueUSD: balanceBTC * (btcPrice.usd || 0),
      change24h: btcPrice.brl_24h_change || 0,
    },
    tokens: [], nfts: [],
  };
}

module.exports = { getBitcoinPortfolio };
