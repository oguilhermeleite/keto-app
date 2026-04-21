const { getPrices, SYMBOL_TO_CG } = require('./prices');
const { fetchWithTimeout } = require('./fetch-timeout');

const EVM_CHAINS = {
  ethereum: { subdomain: 'eth-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  polygon:  { subdomain: 'polygon-mainnet', nativeSymbol: 'POL', cgId: 'matic-network', nativeLogo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  base:     { subdomain: 'base-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  arbitrum: { subdomain: 'arb-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  optimism: { subdomain: 'opt-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
};

async function rpc(chain, method, params) {
  const cfg = EVM_CHAINS[chain];
  const url = `https://${cfg.subdomain}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }, 8000);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function getEVMPortfolio(chain, address) {
  const cfg = EVM_CHAINS[chain];

  const [balHex, tokenData] = await Promise.all([
    rpc(chain, 'eth_getBalance', [address, 'latest']),
    rpc(chain, 'alchemy_getTokenBalances', [address]),
  ]);

  const nativeAmount = parseInt(balHex, 16) / 1e18;
  const nonZero = (tokenData.tokenBalances || []).filter(
    t => t.tokenBalance && !t.tokenBalance.match(/^0x0+$/)
  );

  const tokenDetails = await Promise.all(
    nonZero.slice(0, 10).map(async t => {
      try {
        const meta = await rpc(chain, 'alchemy_getTokenMetadata', [t.contractAddress]);
        const dec = meta.decimals || 18;
        const amount = parseInt(t.tokenBalance, 16) / Math.pow(10, dec);
        if (amount < 0.0001) return null;
        return { contract: t.contractAddress, symbol: meta.symbol, name: meta.name, logo: meta.logo, amount };
      } catch { return null; }
    })
  );

  const validTokens = tokenDetails.filter(Boolean);
  const cgIds = new Set([cfg.cgId]);
  validTokens.forEach(t => { const id = SYMBOL_TO_CG[t.symbol]; if (id) cgIds.add(id); });
  const prices = await getPrices([...cgIds]);

  const nativePrice = prices[cfg.cgId] || {};
  const native = {
    chain, symbol: cfg.nativeSymbol,
    name: cfg.nativeSymbol === 'ETH' ? 'Ethereum' : 'Polygon',
    amount: nativeAmount, isNative: true, logo: cfg.nativeLogo,
    priceBRL: nativePrice.brl || 0, priceUSD: nativePrice.usd || 0,
    valueBRL: nativeAmount * (nativePrice.brl || 0),
    valueUSD: nativeAmount * (nativePrice.usd || 0),
    change24h: nativePrice.brl_24h_change || 0,
  };

  const tokens = validTokens.map(t => {
    const cgId = SYMBOL_TO_CG[t.symbol];
    const p = cgId ? (prices[cgId] || {}) : {};
    return {
      chain, contract: t.contract, symbol: t.symbol, name: t.name, logo: t.logo, amount: t.amount,
      priceBRL: p.brl || 0, priceUSD: p.usd || 0,
      valueBRL: t.amount * (p.brl || 0), valueUSD: t.amount * (p.usd || 0),
      change24h: p.brl_24h_change || 0,
    };
  });

  let nfts = [];
  try {
    const cfg2 = EVM_CHAINS[chain];
    const nftUrl = `https://${cfg2.subdomain}.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;
    const nftRes = await fetchWithTimeout(nftUrl, {}, 8000);
    const nftData = await nftRes.json();
    nfts = (nftData.ownedNfts || []).map(n => ({
      chain, contract: n.contract?.address, tokenId: n.tokenId,
      name: n.name || `${n.contract?.name || 'NFT'} #${n.tokenId}`,
      collection: n.contract?.name || 'Unknown',
      image: n.image?.cachedUrl || n.image?.originalUrl,
      floorPrice: n.contract?.openSeaMetadata?.floorPrice,
    }));
  } catch (err) {
    console.error(`NFT fetch failed for ${chain}:`, err.message);
  }

  return { chain, address, native, tokens, nfts };
}

module.exports = { getEVMPortfolio };
