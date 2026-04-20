import React, { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { Plus, Eye, EyeOff, ArrowUpRight, ArrowDownRight, Image as ImageIcon, RefreshCw, ExternalLink, X, Wallet, AlertCircle } from 'lucide-react';
import { useMultiWallet } from './hooks/useKeto';

// Dados mock pra quando não há backend conectado ou nenhuma wallet
const MOCK_DATA = {
  summary: { totalBRL: 127843.52, totalUSD: 23245.18, tokenCount: 7, nftCount: 3 },
  tokens: [
    { symbol: 'SOL', name: 'Solana', chain: 'solana', amount: 42.3, valueBRL: 41454.00, change24h: 6.87, logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { symbol: 'ETH', name: 'Ethereum', chain: 'ethereum', amount: 1.847, valueBRL: 34991.18, change24h: 4.21, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'USDC', name: 'USD Coin', chain: 'ethereum', amount: 2840, valueBRL: 15620.00, change24h: 0.02, logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'AERO', name: 'Aerodrome', chain: 'base', amount: 4230, valueBRL: 15693.30, change24h: 8.12, logo: 'https://assets.coingecko.com/coins/images/31745/small/token.png' },
    { symbol: 'BTC', name: 'Bitcoin', chain: 'bitcoin', amount: 0.0342, valueBRL: 13139.64, change24h: 2.14, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    { symbol: 'ARB', name: 'Arbitrum', chain: 'ethereum', amount: 890, valueBRL: 4289.80, change24h: 3.45, logo: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
    { symbol: 'MATIC', name: 'Polygon', chain: 'polygon', amount: 1240, valueBRL: 2653.60, change24h: -1.23, logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  ],
  nfts: [
    { name: 'Mad Lads', tokenId: '#4821', chain: 'solana', floorBRL: 57232, image: 'https://madlads.s3.us-west-2.amazonaws.com/images/4821.png', collection: 'Mad Lads' },
    { name: 'Pudgy Penguin', tokenId: '#8234', chain: 'ethereum', floorBRL: 242432, image: 'https://i.seadn.io/gae/yNi-XdGxsgQCPpqSio4o31ygAV6wURdIdInWRcFIl02GOWra6dBXn3rTELZEMrO5z2MS9Xrf84ZvC4b6B_MdBYEcP8a8K0w5BZxYiw?auto=format&w=1000', collection: 'Pudgy Penguins' },
    { name: 'DeGods', tokenId: '#1847', chain: 'solana', floorBRL: 278320, image: 'https://metadata.degods.com/g/1846-dead.png', collection: 'DeGods' },
  ],
};

const CHAINS = [
  { id: 'all', name: 'Todas', color: '#a1a1aa' },
  { id: 'ethereum', name: 'Ethereum', color: '#627eea' },
  { id: 'bitcoin', name: 'Bitcoin', color: '#f7931a' },
  { id: 'solana', name: 'Solana', color: '#9945ff' },
  { id: 'base', name: 'Base', color: '#0052ff' },
  { id: 'polygon', name: 'Polygon', color: '#8247e5' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28a0f0' },
  { id: 'optimism', name: 'Optimism', color: '#ff0420' },
];

const CHART_DATA = [
  { date: 'Jan', value: 78200 }, { date: 'Fev', value: 82100 }, { date: 'Mar', value: 76800 },
  { date: 'Abr', value: 89400 }, { date: 'Mai', value: 94200 }, { date: 'Jun', value: 102800 },
  { date: 'Jul', value: 98900 }, { date: 'Ago', value: 108400 }, { date: 'Set', value: 115200 },
  { date: 'Out', value: 121800 }, { date: 'Nov', value: 124300 }, { date: 'Dez', value: 127843 },
];

export default function App() {
  const [hideBalance, setHideBalance] = useState(false);
  const [activeTab, setActiveTab] = useState('tokens');
  const [selectedChain, setSelectedChain] = useState('all');
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [wallets, setWallets] = useState([]);

  // Carrega carteiras do localStorage (fica só no navegador do usuário)
  useEffect(() => {
    const saved = localStorage.getItem('keto_wallets');
    if (saved) {
      try { setWallets(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('keto_wallets', JSON.stringify(wallets));
  }, [wallets]);

  const { data: realData, loading, error, refetch } = useMultiWallet(wallets);

  // Usa dados reais se tiver wallets, senão mostra mock (pra demonstração)
  const data = wallets.length > 0 && realData ? realData : MOCK_DATA;
  const isDemo = wallets.length === 0;

  const addWallet = () => {
    const trimmed = newAddress.trim();
    if (!trimmed || wallets.includes(trimmed)) return;
    setWallets([...wallets, trimmed]);
    setNewAddress('');
    setShowAddWallet(false);
  };

  const removeWallet = (addr) => {
    setWallets(wallets.filter(w => w !== addr));
  };

  const filteredTokens = useMemo(() => {
    if (!data?.tokens) return [];
    if (selectedChain === 'all') return data.tokens;
    return data.tokens.filter(t => t.chain === selectedChain);
  }, [data, selectedChain]);

  const formatBRL = (v) => hideBalance ? '••••••' : `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAmount = (v) => hideBalance ? '••••' : (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 6 });

  const TokenLogo = ({ token, size = 40 }) => {
    const [imgError, setImgError] = useState(false);
    const chainColor = CHAINS.find(c => c.id === token.chain)?.color;
    
    if (imgError || !token.logo) {
      return (
        <div className="relative" style={{ width: size, height: size }}>
          <div className="rounded-full flex items-center justify-center font-semibold w-full h-full bg-zinc-800 text-zinc-300" style={{ fontSize: size * 0.35 }}>
            {token.symbol?.slice(0, 2)}
          </div>
          {chainColor && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-950" style={{ background: chainColor }} />}
        </div>
      );
    }
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <img src={token.logo} alt={token.symbol} className="rounded-full w-full h-full object-cover bg-zinc-800" onError={() => setImgError(true)} />
        {chainColor && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-950" style={{ background: chainColor }} />}
      </div>
    );
  };

  const NFTImage = ({ nft }) => {
    const [imgError, setImgError] = useState(false);
    if (imgError || !nft.image) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-2">
          <ImageIcon className="w-12 h-12 text-zinc-700" />
          <span className="text-xs text-zinc-600 font-mono">{nft.tokenId}</span>
        </div>
      );
    }
    return <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />;
  };

  const totalChange = 3.42;
  const totalChangeValue = (data?.summary?.totalBRL || 0) * (totalChange / 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`
      }} />

      <header className="border-b border-zinc-900 backdrop-blur-xl bg-zinc-950/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-sm font-bold text-zinc-950">K</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">keto</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">portfolio · beta</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={refetch} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" disabled={loading}>
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setHideBalance(!hideBalance)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
              {hideBalance ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
            </button>
            <button onClick={() => setShowAddWallet(true)} className="ml-2 px-3 py-1.5 bg-zinc-100 text-zinc-950 text-xs font-medium rounded-lg hover:bg-white transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {isDemo && (
          <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-emerald-100">Modo demonstração</p>
              <p className="text-xs text-zinc-400 mt-1">Adiciona uma carteira pra ver teus saldos reais. Só endereços públicos, nunca private key.</p>
            </div>
            <button onClick={() => setShowAddWallet(true)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap">
              Adicionar wallet →
            </button>
          </div>
        )}

        {error && (
          <div className="mb-8 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-100">Erro ao buscar dados</p>
              <p className="text-xs text-zinc-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="mb-12">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Patrimônio total</p>
          <div className="flex items-baseline gap-4 mb-2">
            <h2 className="text-5xl md:text-6xl font-light tracking-tight font-mono">{formatBRL(data?.summary?.totalBRL)}</h2>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className={`flex items-center gap-1 ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="font-mono">{formatBRL(Math.abs(totalChangeValue))}</span>
              <span className="font-mono">({totalChange > 0 ? '+' : ''}{totalChange}%)</span>
            </span>
            <span className="text-zinc-600">24h</span>
          </div>
        </section>

        {/* Wallets conectadas */}
        {wallets.length > 0 && (
          <section className="mb-10">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Carteiras conectadas</p>
            <div className="flex flex-wrap gap-2">
              {wallets.map(w => (
                <div key={w} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-xs">
                  <Wallet className="w-3 h-3 text-zinc-500" />
                  <span className="font-mono text-zinc-300">{w.slice(0, 6)}...{w.slice(-4)}</span>
                  <button onClick={() => removeWallet(w)} className="text-zinc-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tokens</p>
            <p className="text-2xl font-light font-mono">{data?.summary?.tokenCount || 0}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">NFTs</p>
            <p className="text-2xl font-light font-mono">{data?.summary?.nftCount || 0}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5" style={{ boxShadow: '0 0 40px rgba(34, 197, 94, 0.08)' }}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">USD</p>
            <p className="text-2xl font-light font-mono">${(data?.summary?.totalUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-medium">Evolução do patrimônio</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Últimos 12 meses</p>
            </div>
            <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              {['7D', '1M', '3M', '1A', 'TOTAL'].map((p) => (
                <button key={p} className={`px-3 py-1 text-xs rounded font-mono transition-colors ${p === '1A' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={CHART_DATA}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#a1a1aa' }} formatter={(v) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Patrimônio']} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CHAINS.map(chain => (
            <button key={chain.id} onClick={() => setSelectedChain(chain.id)}
              className={`px-4 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedChain === chain.id ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}>
              {chain.id !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: chain.color }} />}
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-6 border-b border-zinc-900 mb-6">
          {[
            { id: 'tokens', label: 'Tokens', count: filteredTokens.length },
            { id: 'nfts', label: 'NFTs', count: data?.nfts?.length || 0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm transition-colors relative ${activeTab === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab.label}
              <span className="ml-2 text-xs text-zinc-600 font-mono">{tab.count}</span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-400" />}
            </button>
          ))}
        </div>

        {activeTab === 'tokens' && (
          <div className="space-y-1">
            {filteredTokens.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Nenhum token encontrado</div>
            ) : (
              filteredTokens.sort((a, b) => (b.valueBRL || 0) - (a.valueBRL || 0)).map((token, i) => (
                <div key={`${token.symbol}-${token.chain}-${i}`} className="group flex items-center justify-between p-4 rounded-xl hover:bg-zinc-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <TokenLogo token={token} size={40} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{token.name}</p>
                        <span className="text-[10px] text-zinc-600 uppercase font-mono tracking-wider">{token.chain}</span>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">{formatAmount(token.amount)} {token.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{formatBRL(token.valueBRL)}</p>
                    {token.change24h !== undefined && (
                      <p className={`text-xs font-mono ${token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.nfts || []).length === 0 ? (
              <div className="col-span-3 text-center py-12 text-zinc-500 text-sm">Nenhum NFT encontrado</div>
            ) : (
              data.nfts.map((nft, i) => (
                <div key={i} onClick={() => setSelectedNFT(nft)}
                  className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer group">
                  <div className="aspect-square overflow-hidden relative bg-zinc-900">
                    <NFTImage nft={nft} />
                    <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 font-mono">
                      {nft.chain}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-zinc-500 mb-0.5">{nft.collection}</p>
                    <p className="text-sm font-medium mb-3">{nft.name} {nft.tokenId}</p>
                    {nft.floorBRL && (
                      <div className="flex justify-between items-center pt-3 border-t border-zinc-800/60">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Floor</span>
                        <span className="text-xs font-mono">{formatBRL(nft.floorBRL)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-zinc-900 text-center">
          <p className="text-xs text-zinc-600">
            Keto · Portfolio tracker read-only · <span className="text-zinc-500">nunca insira sua seed phrase ou private key</span>
          </p>
        </footer>
      </main>

      {/* Modal Add Wallet */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddWallet(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">Adicionar carteira</h3>
                <p className="text-xs text-zinc-500 mt-1">Cola o endereço público. Suportamos Ethereum, Bitcoin, Solana e todas as EVM.</p>
              </div>
              <button onClick={() => setShowAddWallet(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWallet()}
              placeholder="0x... ou bc1... ou endereço Solana"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              autoFocus
            />
            <div className="mt-3 text-[11px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              ⚠️ Keto é <span className="text-zinc-300">somente leitura</span>. Nunca pedimos private key ou seed phrase. Teu endereço fica salvo apenas neste navegador.
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddWallet(false)} className="flex-1 py-2 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800/50 transition-colors">
                Cancelar
              </button>
              <button onClick={addWallet} disabled={!newAddress.trim()} className="flex-1 py-2 bg-emerald-500 text-zinc-950 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal NFT */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNFT(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="aspect-square">
              <NFTImage nft={selectedNFT} />
            </div>
            <div className="p-6">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{selectedNFT.collection}</p>
              <h3 className="text-xl font-medium mb-4">{selectedNFT.name} {selectedNFT.tokenId}</h3>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Rede</p>
                  <p className="text-sm font-mono uppercase">{selectedNFT.chain}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Floor</p>
                  <p className="text-sm font-mono">{formatBRL(selectedNFT.floorBRL)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
