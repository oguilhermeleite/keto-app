module.exports = function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    name: 'Keto API',
    version: '1.0.0',
    services: {
      alchemy: !!process.env.ALCHEMY_API_KEY,
      helius: !!process.env.HELIUS_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
};
