const { getEVMPortfolio } = require('../lib/alchemy');
const { getSolanaPortfolio } = require('../lib/helius');
const { getBitcoinPortfolio } = require('../lib/bitcoin');

const isEVM     = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);
const isSolana  = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
const isBitcoin = (a) => /^(bc1[a-z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Endereço obrigatório' });

  const detected = {
    isEVM: isEVM(address),
    isSolana: isSolana(address),
    isBitcoin: isBitcoin(address),
    length: address.length,
  };

  const tasks = [];

  if (detected.isEVM) {
    ['ethereum', 'polygon', 'base', 'arbitrum', 'optimism'].forEach(chain => {
      tasks.push(getEVMPortfolio(chain, address).catch(e => ({ chain, error: e.message })));
    });
  }

  if (detected.isSolana) {
    tasks.push(getSolanaPortfolio(address).catch(e => ({ chain: 'solana', error: e.message })));
  }

  if (detected.isBitcoin) {
    tasks.push(getBitcoinPortfolio(address).catch(e => ({ chain: 'bitcoin', error: e.message })));
  }

  if (tasks.length === 0) {
    return res.status(400).json({ error: 'Formato de endereço inválido', address, detected });
  }

  const results = await Promise.all(tasks);
  const successful = results.filter(r => !r.error);
  const errors = results.filter(r => r.error);

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

  res.status(200).json({
    address,
    detected,
    summary: { totalBRL, totalUSD, tokenCount: allTokens.length, nftCount: allNFTs.length },
    tokens: allTokens.sort((a, b) => (b.valueBRL || 0) - (a.valueBRL || 0)),
    nfts: allNFTs,
    errors,
    timestamp: new Date().toISOString(),
  });
};
