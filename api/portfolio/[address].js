const { getEVMPortfolio } = require('../lib/alchemy');
const { getSolanaPortfolio } = require('../lib/helius');
const { getBitcoinPortfolio } = require('../lib/bitcoin');
const { withTimeout } = require('../lib/fetch-timeout');

const isEVM     = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);
const isSolana  = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
const isBitcoin = (a) => /^(bc1[a-z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const detected = {
    isEVM: isEVM(address),
    isSolana: isSolana(address),
    isBitcoin: isBitcoin(address),
    length: address.length,
  };

  const tasks = [];

  if (detected.isEVM) {
    ['ethereum', 'polygon', 'base', 'arbitrum', 'optimism'].forEach(chain => {
      tasks.push(
        withTimeout(getEVMPortfolio(chain, address), 15000, `${chain} fetch`)
          .catch(e => ({ chain, error: e.message, failed: true }))
      );
    });
  }

  if (detected.isSolana) {
    tasks.push(
      withTimeout(getSolanaPortfolio(address), 15000, 'solana fetch')
        .catch(e => ({ chain: 'solana', error: e.message, failed: true }))
    );
  }

  if (detected.isBitcoin) {
    tasks.push(
      withTimeout(getBitcoinPortfolio(address), 15000, 'bitcoin fetch')
        .catch(e => ({ chain: 'bitcoin', error: e.message, failed: true }))
    );
  }

  if (tasks.length === 0) {
    return res.status(400).json({ error: 'Invalid address format', address, detected });
  }

  const results = await Promise.all(tasks);
  const successful = results.filter(r => !r.failed);
  const errors = results.filter(r => r.failed);

  let totalBRL = 0, totalUSD = 0;
  const allTokens = [], allNFTs = [];

  successful.forEach(chain => {
    if (chain.native && chain.native.amount > 0) {
      totalBRL += chain.native.valueBRL || 0;
      totalUSD += chain.native.valueUSD || 0;
      allTokens.push(chain.native);
    }
    (chain.tokens || []).forEach(t => {
      totalBRL += t.valueBRL || 0;
      totalUSD += t.valueUSD || 0;
      allTokens.push(t);
    });
    (chain.nfts || []).forEach(n => allNFTs.push(n));
  });

  // Status inteligente: se tudo falhou, retorna erro. Se parcial, indica.
  const status = errors.length === tasks.length ? 'error' :
                 errors.length > 0 ? 'partial' : 'ok';

  res.status(200).json({
    status,
    address,
    detected,
    summary: { totalBRL, totalUSD, tokenCount: allTokens.length, nftCount: allNFTs.length },
    tokens: allTokens.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0)),
    nfts: allNFTs,
    errors: errors.map(e => ({ chain: e.chain, error: e.error })),
    timestamp: new Date().toISOString(),
  });
};
