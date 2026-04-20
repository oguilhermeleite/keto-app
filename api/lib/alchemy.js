import { getPrices, SYMBOL_TO_CG } from './prices.js';

const EVM_CHAINS = {
  ethereum: { subdomain: 'eth-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum' },
  polygon:  { subdomain: 'polygon-mainnet', nativeSymbol: 'POL', cgId: 'matic-network' },
  base:     { subdomain: 'base-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum' },
  arbitrum: { subdomain: 'arb-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum' },
  optimism: { subdomain: 'opt-mainnet', nativeSymbol: 'ETH', cgId: 'ethereum' },
};

function alchemyUrl(chain) {
  const c = EVM_CHAINS[chain];
  return `https://${c.subdomain}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
}

async function rpc(chain, method, params) {
  const res = await fetch(alchemyUrl(chain), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function getEVMPortfolio(chain, address) {
  const cfg = EVM_CHAINS[chain];

  // Busca saldo nativo + tokens em paralelo
  const [balHex, tokenData] = await Promise.all([
    rpc(chain, 'eth_getBalance', [address, 'latest']),
    rpc(chain, 'alchemy_getTokenBalances', [address]),
  ]);

  const nativeAmount = parseInt(balHex, 16) / 1e18;

  // Filtra tokens com saldo
  const nonZero = (tokenData.tokenBalances || []).filter(
    t => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  // Busca metadata dos tokens em paralelo (máx 10 pra não estourar)
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

  // Busca preços
  const cgIds = new Set([cfg.cgId]);
  validTokens.forEach(t => { const id = SYMBOL_TO_CG[t.symbol]; if (id) cgIds.add(id); });
  const prices = await getPrices([...cgIds]);

  const nativePrice = prices[cfg.cgId] || {};
  const native = {
    chain, symbol: cfg.nativeSymbol, name: cfg.nativeSymbol === 'ETH' ? 'Ethereum' : 'Polygon',
    amount: nativeAmount, isNative: true,
    priceBRL: nativePrice.brl || 0, priceUSD: nativePrice.usd || 0,
    valueBRL: nativeAmount * (nativePrice.brl || 0),
    valueUSD: nativeAmount * (nativePrice.usd || 0),
    change24h: nativePrice.brl_24h_change || 0,
    logo: `https://assets.coingecko.com/coins/images/${cfg.cgId === 'ethereum' ? '279/small/ethereum.png' : '4713/small/polygon.png'}`,
  };

  const tokens = validTokens.map(t => {
    const cgId = SYMBOL_TO_CG[t.symbol];
    const p = cgId ? (prices[cgId] || {}) : {};
    return {
      chain, contract: t.contract, symbol: t.symbol, name: t.name,
      logo: t.logo, amount: t.amount,
      priceBRL: p.brl || 0, priceUSD: p.usd || 0,
      valueBRL: t.amount * (p.brl || 0), valueUSD: t.amount * (p.usd || 0),
      change24h: p.brl_24h_change || 0,
    };
  });

  // NFTs
  let nfts = [];
  try {
    const nftUrl = `https://${EVM_CHAINS[chain].subdomain}.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;
    const nftRes = await fetch(nftUrl);
    const nftData = await nftRes.json();
    nfts = (nftData.ownedNfts || []).map(n => ({
      chain, contract: n.contract?.address, tokenId: n.tokenId,
      name: n.name || `${n.contract?.name || 'NFT'} #${n.tokenId}`,
      collection: n.contract?.name || 'Unknown',
      image: n.image?.cachedUrl || n.image?.originalUrl,
      floorPrice: n.contract?.openSeaMetadata?.floorPrice,
    }));
  } catch {}

  return { chain, address, native, tokens, nfts };
}
