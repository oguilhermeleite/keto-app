const { getSolanaPortfolio } = require('../lib/helius');

module.exports = async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  console.log('[DEBUG] Testing Solana address:', address);
  console.log('[DEBUG] HELIUS_API_KEY exists:', !!process.env.HELIUS_API_KEY);

  try {
    const result = await getSolanaPortfolio(address);
    return res.status(200).json({
      success: true,
      result,
      debug: {
        apiKeyConfigured: !!process.env.HELIUS_API_KEY,
        nativeBalance: result.native.amount,
        tokenCount: result.tokens.length,
        nftCount: result.nfts.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      debug: {
        apiKeyConfigured: !!process.env.HELIUS_API_KEY,
        timestamp: new Date().toISOString(),
      },
    });
  }
};
