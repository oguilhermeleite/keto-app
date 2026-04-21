const { getDefiPositions } = require('../lib/defi');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const positions = await getDefiPositions([address]);
    res.status(200).json({
      address,
      positions,
      count: positions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
