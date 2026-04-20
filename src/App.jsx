import React, { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { Plus, Eye, EyeOff, ArrowUpRight, Image as ImageIcon, RefreshCw, X, Wallet, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useMultiWallet } from './hooks/useKeto';

const CHAINS = [
  { id: 'all',      name: 'Todas',    color: '#a1a1aa' },
  { id: 'solana',   name: 'Solana',   color: '#9945ff' },
  { id: 'ethereum', name: 'Ethereum', color: '#627eea' },
  { id: 'bitcoin',  name: 'Bitcoin',  color: '#f7931a' },
  { id: 'base',     name: 'Base',     color: '#0052ff' },
  { id: 'polygon',  name: 'Polygon',  color: '#8247e5' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28a0f0' },
  { id: 'optimism', name: 'Optimism', color: '#ff0420' },
];
const CHAIN_COLOR = Object.fromEntries(CHAINS.map(c => [c.id, c.color]));

function TokenLogo({ token, size = 40 }) {
  const [err, setErr] = useState(false);
  const cc = CHAIN_COLOR[token.chain];
  const badgeSize = Math.max(14, size * 0.35);
  if (err || !token.logo) return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full w-full h-full flex items-center justify-center font-semibold bg-zinc-800 text-zinc-300" style={{ fontSize: size * 0.32 }}>
        {(token.symbol || '?').slice(0, 2).toUpperCase()}
      </div>
      {cc && <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-950" style={{ width: badgeSize, height: badgeSize, background: cc }} />}
    </div>
  );
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <img src={token.logo} alt={token.symbol} className="rounded-full w-full h-full object-cover bg-zinc-800" onError={() => setErr(true)} />
      {cc && <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-950" style={{ width: badgeSize, height: badgeSize, background: cc }} />}
    </div>
  );
}

function TokenRow({ token }) {
  const fmt    = (v) => `R$ ${(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtAmt = (v) => (v||0).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const isRune = token.isRune;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl active:bg-zinc-900/60 hover:bg-zinc-900/40 transition-colors">
      <TokenLogo token={token} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{token.name}</p>
          {isRune && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono uppercase flex-shrink-0">Rune</span>}
        </div>
        <p className="text-xs text-zinc-500 font-mono truncate">{fmtAmt(token.amount)} {token.symbol}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono">{fmt(token.valueBRL)}</p>
        {token.change24h !== 0 && (
          <p className={`text-xs font-mono ${token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {token.change24h > 0 ? '+' : ''}{(token.change24h||0).toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
}

function NFTCard({ nft, onPress }) {
  const [err, setErr] = useState(false);
  const isOrdinal = nft.isOrdinal;
  const cc = CHAIN_COLOR[nft.chain] || '#a1a1aa';

  return (
    <div onClick={onPress} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden active:scale-95 transition-transform cursor-pointer">
      <div className="aspect-square bg-zinc-900 relative overflow-hidden">
        {err || !nft.image
          ? <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <ImageIcon className="w-8 h-8 text-zinc-700" />
              {isOrdinal && <span className="text-[10px] text-zinc-600 font-mono">#{nft.inscriptionNumber}</span>}
            </div>
          : <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        }
        <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase rounded-full border font-mono" style={{ background: `${cc}20`, borderColor: `${cc}40`, color: cc }}>
          {isOrdinal ? 'Ordinal' : nft.chain}
        </div>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-zinc-500 truncate mb-0.5">{nft.collection}</p>
        <p className="text-xs font-medium truncate">{nft.name}</p>
        {nft.floorPrice && (
          <p className="text-[10px] text-zinc-500 font-mono mt-1">{nft.floorPrice} ETH floor</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [hideBalance, setHideBalance]     = useState(false);
  const [activeTab, setActiveTab]         = useState('tokens');
  const [selectedChain, setSelectedChain] = useState('all');
  const [selectedNFT, setSelectedNFT]     = useState(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newAddress, setNewAddress]       = useState('');
  const [wallets, setWallets]             = useState([]);
  const [showSpam, setShowSpam]           = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('keto_wallets');
    if (saved) { try { setWallets(JSON.parse(saved)); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem('keto_wallets', JSON.stringify(wallets)); }, [wallets]);

  const { data, loading, error, refetch } = useMultiWallet(wallets);

  const addWallet = () => {
    const t = newAddress.trim();
    if (!t || wallets.includes(t)) return;
    setWallets([...wallets, t]);
    setNewAddress('');
    setShowAddWallet(false);
  };
  const removeWallet = (a) => setWallets(wallets.filter(w => w !== a));

  const { valueTokens, spamTokens } = useMemo(() => {
    const all = data?.tokens || [];
    return {
      valueTokens: all.filter(t => (t.valueBRL || 0) > 0.5),
      spamTokens:  all.filter(t => (t.valueBRL || 0) <= 0.5),
    };
  }, [data]);

  const filteredValue = useMemo(() => {
    if (selectedChain === 'all') return valueTokens;
    return valueTokens.filter(t => t.chain === selectedChain);
  }, [valueTokens, selectedChain]);

  const filteredSpam = useMemo(() => {
    if (selectedChain === 'all') return spamTokens;
    return spamTokens.filter(t => t.chain === selectedChain);
  }, [spamTokens, selectedChain]);

  const filteredNFTs = useMemo(() => {
    const all = data?.nfts || [];
    if (selectedChain === 'all') return all;
    return all.filter(n => n.chain === selectedChain);
  }, [data, selectedChain]);

  const total    = data?.summary?.totalBRL || 0;
  const totalUSD = data?.summary?.totalUSD || 0;

  const chartData = useMemo(() => {
    if (!total) return [];
    const months = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];
    return months.map((date, i) => ({
      date,
      value: Math.round(total * (0.65 + (i / (months.length - 1)) * 0.35)),
    }));
  }, [total]);

  const fmt = (v) => hideBalance
    ? '••••••'
    : `R$ ${(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeChains = [...new Set((data?.tokens || []).map(t => t.chain))];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-8">
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")` }} />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-xl bg-zinc-950/90 sticky top-0 z-40">
        <div className="px-5 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-zinc-950">K</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">keto</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">portfolio · beta</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={refetch} disabled={loading} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 rounded-xl transition-colors">
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setHideBalance(!hideBalance)} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 rounded-xl transition-colors">
              {hideBalance ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
            </button>
            <button onClick={() => setShowAddWallet(true)} className="ml-1 px-3.5 py-2 bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-xl hover:bg-white transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-8 relative z-10">
        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Hero balance */}
        <section className="mb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Patrimônio total</p>
          <h2 className="text-4xl font-light tracking-tight font-mono leading-none mb-2">
            {fmt(total)}
          </h2>
          <p className="text-sm text-zinc-500 font-mono">
            ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2.5 mb-8">
          {[
            { label: 'Tokens', value: valueTokens.length },
            { label: 'NFTs',   value: (data?.nfts || []).length },
            { label: 'Redes',  value: activeChains.length },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-light font-mono">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 mb-8">
            <p className="text-xs font-medium mb-1">Evolução estimada</p>
            <p className="text-xs text-zinc-500 mb-4">Baseado no patrimônio atual</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '10px', fontSize: '12px' }} formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Carteiras */}
        {wallets.length > 0 && (
          <section className="mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Carteiras</p>
            <div className="flex flex-wrap gap-2">
              {wallets.map(w => (
                <div key={w} className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-full text-xs">
                  <Wallet className="w-3 h-3 text-zinc-500" />
                  <span className="font-mono text-zinc-300">{w.slice(0, 5)}…{w.slice(-4)}</span>
                  <button onClick={() => removeWallet(w)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chain pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
          {CHAINS.filter(c => c.id === 'all' || activeChains.includes(c.id)).map(c => (
            <button key={c.id} onClick={() => setSelectedChain(c.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                selectedChain === c.id ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-medium' : 'text-zinc-400 border-zinc-800'
              }`}>
              {c.id !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />}
              {c.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-zinc-900 mb-4 mt-5">
          {[
            { id: 'tokens', label: 'Tokens', count: filteredValue.length },
            { id: 'nfts',   label: 'NFTs',   count: filteredNFTs.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 pb-3 text-sm transition-colors relative ${activeTab === tab.id ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
              {tab.label}
              <span className="ml-1.5 text-xs text-zinc-600 font-mono">{tab.count}</span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-4 right-4 h-px bg-emerald-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tokens */}
        {activeTab === 'tokens' && (
          <div>
            {loading && wallets.length > 0 && (
              <div className="space-y-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-800 rounded animate-pulse w-24" />
                      <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-16" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-zinc-800 rounded animate-pulse w-16" />
                      <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredValue.length === 0 && wallets.length === 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-400 text-sm mb-1">Nenhuma carteira conectada</p>
                <p className="text-zinc-600 text-xs mb-5">Adiciona um endereço pra ver teus saldos</p>
                <button onClick={() => setShowAddWallet(true)} className="px-5 py-2.5 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl">
                  + Adicionar carteira
                </button>
              </div>
            )}

            {/* Tokens com valor */}
            <div className="space-y-0.5">
              {filteredValue
                .sort((a, b) => (b.valueBRL || 0) - (a.valueBRL || 0))
                .map((t, i) => <TokenRow key={`v-${t.chain}-${t.contract || t.symbol}-${i}`} token={t} />)}
            </div>

            {/* Divisor spam */}
            {filteredSpam.length > 0 && (
              <div className="mt-5">
                <button onClick={() => setShowSpam(!showSpam)}
                  className="w-full flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-600 flex items-center gap-1.5 flex-shrink-0">
                    {showSpam ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {filteredSpam.length} sem valor
                  </span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </button>

                {showSpam && (
                  <div className="space-y-0.5 opacity-40">
                    {filteredSpam.map((t, i) => <TokenRow key={`s-${t.chain}-${t.contract || t.symbol}-${i}`} token={t} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NFTs */}
        {activeTab === 'nfts' && (
          <div>
            {filteredNFTs.length === 0 ? (
              <p className="text-center py-12 text-zinc-500 text-sm">Nenhum NFT ou Ordinal encontrado</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredNFTs.map((nft, i) => (
                  <NFTCard key={i} nft={nft} onPress={() => setSelectedNFT(nft)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Wallet modal */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddWallet(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-semibold">Adicionar carteira</h3>
                <p className="text-xs text-zinc-500 mt-1">Suporta Ethereum, Bitcoin, Solana e redes EVM</p>
              </div>
              <button onClick={() => setShowAddWallet(false)} className="text-zinc-500 p-1"><X className="w-4 h-4" /></button>
            </div>
            <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWallet()}
              placeholder="0x... · bc1... · endereço Solana"
              className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              autoFocus />
            <p className="mt-3 text-[11px] text-zinc-500 bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-3 leading-relaxed">
              🔒 Somente leitura. Nunca pedimos private key ou seed phrase. Endereços ficam salvos apenas neste dispositivo.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddWallet(false)} className="flex-1 py-3 border border-zinc-800 rounded-xl text-sm hover:bg-zinc-800/50 transition-colors">Cancelar</button>
              <button onClick={addWallet} disabled={!newAddress.trim()}
                className="flex-1 py-3 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFT modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedNFT(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl overflow-hidden w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="aspect-square bg-zinc-900 mt-2">
              {selectedNFT.image
                ? <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-zinc-700" /></div>
              }
            </div>
            <div className="p-5">
              <p className="text-xs text-zinc-500 mb-1">{selectedNFT.collection}</p>
              <h3 className="text-lg font-medium mb-4">{selectedNFT.name}</h3>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Rede</p>
                  <p className="text-sm font-mono uppercase">{selectedNFT.chain}</p>
                </div>
                {selectedNFT.isOrdinal && selectedNFT.inscriptionNumber && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Inscrição</p>
                    <p className="text-sm font-mono">#{selectedNFT.inscriptionNumber}</p>
                  </div>
                )}
                {selectedNFT.floorPrice && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Floor</p>
                    <p className="text-sm font-mono">{selectedNFT.floorPrice} ETH</p>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedNFT(null)} className="w-full mt-4 py-3 border border-zinc-800 rounded-xl text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
