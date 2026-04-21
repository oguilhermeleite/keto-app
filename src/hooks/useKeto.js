import { useState, useEffect, useCallback } from 'react';

const KETO_API = import.meta.env.VITE_KETO_API || '';

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // backoff
    }
  }
}

export function usePortfolio(address, chains = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const query = chains ? `?chains=${chains.join(',')}` : '';
      const data = await fetchWithRetry(`${KETO_API}/api/portfolio/${address}${query}`);
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, chains?.join(',')]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);
  return { data, loading, error, refetch: fetchPortfolio };
}

export function useMultiWallet(addresses = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partial, setPartial] = useState(false);

  const fetchAll = useCallback(async () => {
    if (addresses.length === 0) {
      setData(null);
      setError(null);
      setPartial(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPartial(false);

    try {
      const results = await Promise.all(
        addresses.map(addr =>
          fetchWithRetry(`${KETO_API}/api/portfolio/${addr}`)
            .catch(e => ({ error: e.message, address: addr, failed: true }))
        )
      );

      const failedCount = results.filter(r => r.failed).length;
      const partialCount = results.filter(r => r.status === 'partial').length;
      if (failedCount === addresses.length) {
        throw new Error('Falha ao buscar todas as carteiras');
      }
      if (failedCount > 0 || partialCount > 0) {
        setPartial(true);
      }

      let totalBRL = 0, totalUSD = 0;
      const allTokens = [], allNFTs = [];

      results.forEach(r => {
        if (r.failed) return;
        if (r.summary) {
          totalBRL += r.summary.totalBRL || 0;
          totalUSD += r.summary.totalUSD || 0;
        }
        (r.tokens || []).forEach(t => allTokens.push({ ...t, walletAddress: r.address }));
        (r.nfts || []).forEach(n => allNFTs.push({ ...n, walletAddress: r.address }));
      });

      setData({
        summary: { totalBRL, totalUSD, tokenCount: allTokens.length, nftCount: allNFTs.length },
        tokens: allTokens.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0)),
        nfts: allNFTs,
        wallets: results,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [addresses.join(',')]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { data, loading, error, partial, refetch: fetchAll };
}

export function useDefiPositions(addresses = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (addresses.length === 0) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        addresses.map(addr =>
          fetch(`${KETO_API}/api/defi/${addr}`)
            .then(r => r.json())
            .catch(() => ({ positions: [] }))
        )
      );
      setData(results.flatMap(r => r.positions || []));
    } catch (err) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [addresses.join(',')]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { data, loading, error, refetch: fetchAll };
}
