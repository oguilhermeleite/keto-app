const { getPrices } = require('./prices');

async function getSolanaPortfolio(address) {
  const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  const res = await fetch(url, {
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
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const assets = data.result;

  const nativeSOL = (assets.nativeBalance?.lamports || 0) / 1e9;
  const prices = await getPrices(['solana']);
  const solPrice = prices.solana || {};
  const usdToBrl = solPrice.brl && solPrice.usd ? solPrice.brl / solPrice.usd : 5.5;

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

  for (const item of assets.items || []) {
    if (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset') {
      const info = item.token_info;
      if (!info?.balance) continue;
      const amount = info.balance / Math.pow(10, info.decimals || 0);
      if (amount < 0.0001) continue;
      const priceUSD = info.price_info?.price_per_token || 0;
      const valueUSD = info.price_info?.total_price || 0;
      tokens.push({
        chain: 'solana', contract: item.id,
        symbol: info.symbol || item.content?.metadata?.symbol || '?',
        name: item.content?.metadata?.name || 'Unknown',
        logo: item.content?.links?.image || null,
        amount, priceUSD, valueUSD,
        priceBRL: priceUSD * usdToBrl,
        valueBRL: valueUSD * usdToBrl,
        change24h: 0,
      });
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

  return { chain: 'solana', address, native, tokens, nfts };
}

module.exports = { getSolanaPortfolio };
