const { getPrices } = require('./prices');
const { getJupiterPrices } = require('./jupiter');
const { fetchWithTimeout } = require('./fetch-timeout');

async function getSolanaPortfolio(address) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY not configured');
  }

  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  let res, data;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          page: 1, limit: 100,
          displayOptions: { showFungible: true, showNativeBalance: true },
        },
      }),
    }, 10000);
    data = await res.json();
  } catch (err) {
    throw new Error(`Helius request failed: ${err.message}`);
  }

  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message}`);
  }

  const assets = data.result;
  if (!assets) {
    throw new Error('No assets returned from Helius');
  }

  const nativeSOL = (assets.nativeBalance?.lamports || 0) / 1e9;
  const prices = await getPrices(['solana']);
  const solPrice = prices.solana || {};

  const native = {
    chain: 'solana', symbol: 'SOL', name: 'Solana', isNative: true,
    amount: nativeSOL,
    logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    priceBRL: solPrice.brl || 0, priceUSD: solPrice.usd || 0,
    valueBRL: nativeSOL * (solPrice.brl || 0),
    valueUSD: nativeSOL * (solPrice.usd || 0),
    change24h: solPrice.brl_24h_change || 0,
  };

  const tokens = [];
  const nfts = [];
  const mintsNeedingPrice = [];

  for (const item of assets.items || []) {
    if (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset') {
      const info = item.token_info;
      if (!info?.balance) continue;
      const amount = info.balance / Math.pow(10, info.decimals || 0);
      if (amount < 0.0001) continue;

      const priceUSDHelius = info.price_info?.price_per_token || 0;
      const valueUSDHelius = info.price_info?.total_price || 0;

      const token = {
        chain: 'solana', contract: item.id,
        symbol: info.symbol || item.content?.metadata?.symbol || '?',
        name: item.content?.metadata?.name || 'Unknown',
        logo: item.content?.links?.image || null,
        amount,
        priceUSD: priceUSDHelius,
        valueUSD: valueUSDHelius,
        priceBRL: 0,
        valueBRL: 0,
        change24h: 0,
      };

      tokens.push(token);

      if (priceUSDHelius === 0) {
        mintsNeedingPrice.push(item.id);
      }
    } else if (['NonFungibleToken', 'ProgrammableNFT', 'Nft'].includes(item.interface)) {
      const content = item.content;
      nfts.push({
        chain: 'solana', contract: item.id, tokenId: item.id,
        name: content?.metadata?.name || 'Unnamed NFT',
        collection: item.grouping?.find(g => g.group_key === 'collection')?.group_value || 'Unknown',
        image: content?.links?.image || content?.files?.[0]?.uri || null,
      });
    }
  }

  // Jupiter fallback
  if (mintsNeedingPrice.length > 0) {
    try {
      const jupiterPrices = await getJupiterPrices(mintsNeedingPrice);
      for (const token of tokens) {
        if (token.priceUSD === 0 && jupiterPrices[token.contract]) {
          const jp = jupiterPrices[token.contract];
          token.priceUSD = jp.price;
          token.valueUSD = token.amount * jp.price;
        }
      }
    } catch (err) {
      console.warn('Jupiter fallback failed:', err.message);
    }
  }

  // USD to BRL
  const usdToBrl = solPrice.brl && solPrice.usd ? solPrice.brl / solPrice.usd : 5.5;
  for (const token of tokens) {
    token.priceBRL = token.priceUSD * usdToBrl;
    token.valueBRL = token.valueUSD * usdToBrl;
  }

  return { chain: 'solana', address, native, tokens, nfts };
}

module.exports = { getSolanaPortfolio };
