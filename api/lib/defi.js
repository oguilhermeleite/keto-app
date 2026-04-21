// DeFiLlama API — posições reais em pools e protocolos DeFi
// Docs: https://defillama.com/docs/api

async function getDefiPositions(addresses) {
  const results = [];

  for (const address of addresses) {
    try {
      // DeFiLlama endpoint de positions por endereço
      const url = `https://yields.llama.fi/poolsEnrichedByAddress/${address}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const pos of (data.data || [])) {
        if (!pos.balance || pos.balance <= 0) continue;

        results.push({
          id: pos.pool,
          name: pos.symbol || pos.pool,
          protocol: pos.project,
          chain: normalizeChain(pos.chain),
          valueUSD: pos.balance,
          apy: pos.apy ? parseFloat(pos.apy.toFixed(2)) : null,
          tokens: parseTokens(pos.underlyingTokens, pos.rewardTokens),
          poolUrl: pos.url,
        });
      }
    } catch (e) {
      console.error(`DeFiLlama error for ${address}:`, e.message);
    }
  }

  return results;
}

// Também tenta via Zapper como fallback
async function getDefiPositionsZapper(address) {
  try {
    const url = `https://api.zapper.xyz/v2/balances/apps?addresses[]=${address}&network=ethereum`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from('96e0cc51-a62e-42ca-acb0-3cb352dd0bd5:').toString('base64')}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).flatMap(app =>
      (app.products || []).flatMap(product =>
        (product.assets || []).map(asset => ({
          id: asset.address,
          name: asset.displayProps?.label || asset.type,
          protocol: app.appId,
          chain: app.network,
          valueUSD: asset.balanceUSD,
          apy: null,
          tokens: (asset.tokens || []).map(t => ({
            symbol: t.symbol,
            amount: t.balance,
          })),
        }))
      )
    ).filter(p => p.valueUSD > 0.1);
  } catch { return []; }
}

function normalizeChain(chain) {
  const map = {
    'Ethereum': 'ethereum', 'ethereum': 'ethereum',
    'Solana': 'solana', 'solana': 'solana',
    'Base': 'base', 'base': 'base',
    'Arbitrum': 'arbitrum', 'arbitrum': 'arbitrum',
    'Optimism': 'optimism', 'optimism': 'optimism',
    'Polygon': 'polygon', 'polygon': 'polygon',
    'BSC': 'bsc', 'bsc': 'bsc',
  };
  return map[chain] || chain?.toLowerCase() || 'unknown';
}

function parseTokens(underlying, rewards) {
  const tokens = [];
  (underlying || []).forEach(t => {
    if (t.symbol) tokens.push({ symbol: t.symbol, amount: t.balance || 0 });
  });
  return tokens;
}

module.exports = { getDefiPositions };
