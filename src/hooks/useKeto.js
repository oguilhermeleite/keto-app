import { useState, useEffect, useCallback } from 'react';

const KETO_API = import.meta.env.VITE_KETO_API || '';

/**
 * Busca portfolio de um endereço
 */
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
      const res = await fetch(`${KETO_API}/api/portfolio/${address}${query}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao buscar portfolio');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, chains?.join(',')]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);
  return { data, loading, error, refetch: fetchPortfolio };
}

/**
 * Agrega múltiplas carteiras
 */
export function useMultiWallet(addresses = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (addresses.length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        addresses.map(addr => 
          fetch(`${KETO_API}/api/portfolio/${addr}`)
            .then(r => r.json())
            .catch(() => ({ error: 'fetch failed', address: addr }))
        )
      );
      let totalBRL = 0, totalUSD = 0;
      const allTokens = [], allNFTs = [];
      results.forEach(r => {
        if (r.summary) {
          totalBRL += r.summary.totalBRL || 0;
          totalUSD += r.summary.totalUSD || 0;
        }
        (r.tokens || []).forEach(t => allTokens.push({ ...t, walletAddress: r.address }));
        (r.nfts || []).forEach(n => allNFTs.push({ ...n, walletAddress: r.address }));
      });
      setData({
        summary: { totalBRL, totalUSD, tokenCount: allTokens.length, nftCount: allNFTs.length },
        tokens: allTokens.sort((a, b) => (b.valueBRL || 0) - (a.valueBRL || 0)),
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
  return { data, loading, error, refetch: fetchAll };
}

/**
 * Busca posições DeFi de múltiplos endereços
 */
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
      const all = results.flatMap(r => r.positions || []);
      setData(all);
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
