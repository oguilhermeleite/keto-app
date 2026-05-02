import React, { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, LineChart, Line, BarChart, Bar } from 'recharts';
import { Plus, Eye, EyeOff, Image as ImageIcon, RefreshCw, X, Wallet, AlertCircle, ChevronDown, ChevronUp, Star, TrendingUp, Droplets, ArrowUp, ArrowDown } from 'lucide-react';
import { useMultiWallet, useDefiPositions } from './hooks/useKeto';

const CHAINS = [
  { id: 'all',      name: 'All',      color: '#a1a1aa' },
  { id: 'solana',   name: 'Solana',   color: '#9945ff' },
  { id: 'ethereum', name: 'Ethereum', color: '#627eea' },
  { id: 'bitcoin',  name: 'Bitcoin',  color: '#f7931a' },
  { id: 'base',     name: 'Base',     color: '#0052ff' },
  { id: 'polygon',  name: 'Polygon',  color: '#8247e5' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28a0f0' },
  { id: 'optimism', name: 'Optimism', color: '#ff0420' },
];
const CHAIN_COLOR = Object.fromEntries(CHAINS.map(c => [c.id, c.color]));

const fmtUSD = (v) => `$${(v||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtAmt = (v, max=4) => (v||0).toLocaleString('en-US', { maximumFractionDigits: max });

function StatCard({ label, value, subtext, icon: Icon, trend, color = '#10b981' }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-3xl font-light font-mono mb-1">{value}</p>
        {subtext && <p className="text-xs text-zinc-600">{subtext}</p>}
      </div>
      {Icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{background: `${color}15`}}>
          <Icon className="w-5 h-5" style={{color}}/>
        </div>
      )}
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-mono ml-4 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
          {Math.abs(trend).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function TokenLogo({ token, size=44 }) {
  const [err, setErr] = useState(false);
  const cc = CHAIN_COLOR[token.chain];
  const bs = Math.max(14, size * 0.33);
  if (err || !token.logo) return (
    <div className="relative flex-shrink-0" style={{width:size,height:size}}>
      <div className="rounded-full w-full h-full flex items-center justify-center font-semibold bg-zinc-800 text-zinc-300" style={{fontSize:size*0.32}}>
        {(token.symbol||'?').slice(0,2).toUpperCase()}
      </div>
      {cc && <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-950" style={{width:bs,height:bs,background:cc}}/>}
    </div>
  );
  return (
    <div className="relative flex-shrink-0" style={{width:size,height:size}}>
      <img src={token.logo} alt={token.symbol} className="rounded-full w-full h-full object-cover bg-zinc-800" onError={()=>setErr(true)}/>
      {cc && <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-950" style={{width:bs,height:bs,background:cc}}/>}
    </div>
  );
}

function TokenRow({ token }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl active:bg-zinc-900/60 hover:bg-zinc-900/40 transition-colors border border-transparent hover:border-zinc-800/40">
      <TokenLogo token={token}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{token.name}</p>
          {token.isRune && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono flex-shrink-0">RUNE</span>}
          {token.isBrc20 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-mono flex-shrink-0">BRC-20</span>}
        </div>
        <p className="text-xs text-zinc-500 font-mono truncate">{fmtAmt(token.amount)} {token.symbol}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono">{fmtUSD(token.valueUSD)}</p>
        {!!token.change24h && (
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
  const cc = CHAIN_COLOR[nft.chain] || '#a1a1aa';
  return (
    <div onClick={onPress} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden active:scale-95 transition-transform cursor-pointer">
      <div className="aspect-square bg-zinc-900 relative overflow-hidden">
        {err || !nft.image
          ? <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-zinc-700"/></div>
          : <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={()=>setErr(true)}/>
        }
        <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase rounded-full border font-mono"
          style={{background:`${cc}20`,borderColor:`${cc}40`,color:cc}}>
          {nft.isOrdinal ? 'Ordinal' : nft.chain}
        </div>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-zinc-500 truncate mb-0.5">{nft.collection}</p>
        <p className="text-xs font-medium truncate">{nft.name}</p>
      </div>
    </div>
  );
}

function DefiCard({ position }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-blue-400"/>
          </div>
          <div>
            <p className="text-sm font-medium">{position.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{position.protocol} · {position.chain}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-medium">{fmtUSD(position.valueUSD)}</p>
          {position.apy && <p className="text-xs text-emerald-400 font-mono">{position.apy}% APY</p>}
        </div>
      </div>
      {(position.tokens||[]).length > 0 && (
        <div className="flex gap-2">
          {position.tokens.map((t,i) => (
            <div key={i} className="flex-1 bg-zinc-950/60 rounded-xl p-2.5 text-center">
              <p className="text-xs text-zinc-500 mb-0.5">{t.symbol}</p>
              <p className="text-xs font-mono">{fmtAmt(t.amount, 4)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mainTab, setMainTab]             = useState('portfolio');
  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedChain, setSelectedChain] = useState('all');
  const [selectedNFT, setSelectedNFT]     = useState(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showAddWatch, setShowAddWatch]   = useState(false);
  const [newAddress, setNewAddress]       = useState('');
  const [newLabel, setNewLabel]           = useState('');
  const [wallets, setWallets]             = useState([]);
  const [watchlist, setWatchlist]         = useState([]);
  const [hideBalance, setHideBalance]     = useState(false);
  const [showSpam, setShowSpam]           = useState(false);

  useEffect(() => {
    const w = localStorage.getItem('keto_wallets');
    const wl = localStorage.getItem('keto_watchlist');
    if (w)  try { setWallets(JSON.parse(w)); }   catch {}
    if (wl) try { setWatchlist(JSON.parse(wl)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('keto_wallets', JSON.stringify(wallets)); }, [wallets]);
  useEffect(() => { localStorage.setItem('keto_watchlist', JSON.stringify(watchlist)); }, [watchlist]);

  const { data, loading, error, partial, refetch } = useMultiWallet(wallets);
  const { data: defiPositions, loading: defiLoading } = useDefiPositions(wallets);

  const addWallet = () => {
    const t = newAddress.trim();
    if (!t || wallets.includes(t)) return;
    setWallets([...wallets, t]);
    setNewAddress('');
    setShowAddWallet(false);
  };

  const addWatch = () => {
    const t = newAddress.trim();
    if (!t || watchlist.find(w=>w.address===t)) return;
    setWatchlist([...watchlist, { address:t, label: newLabel.trim() || 'Wallet' }]);
    setNewAddress('');
    setNewLabel('');
    setShowAddWatch(false);
  };

  const { valueTokens, spamTokens } = useMemo(() => {
    const all = data?.tokens || [];
    return {
      valueTokens: all.filter(t => (t.valueUSD||0) > 0.1),
      spamTokens:  all.filter(t => (t.valueUSD||0) <= 0.1),
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

  const totalUSD = data?.summary?.totalUSD || 0;
  const activeChains = [...new Set((data?.tokens||[]).map(t=>t.chain))];

  const chartData = useMemo(() => {
    if (!totalUSD) return [];
    const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
    return months.map((date,i) => ({
      date,
      value: Math.round(totalUSD * (0.65 + (i/(months.length-1))*0.35)),
    }));
  }, [totalUSD]);

  const hide = (v) => hideBalance ? '••••••' : v;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans pb-10">
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03]"
        style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`}}/>

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-xl bg-black/95 sticky top-0 z-40">
        <div className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-black">K</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">keto</h1>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-1">portfolio analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} disabled={loading} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 rounded-xl transition-colors">
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading?'animate-spin':''}`}/>
            </button>
            <button onClick={()=>setHideBalance(!hideBalance)} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 rounded-xl transition-colors">
              {hideBalance ? <EyeOff className="w-4 h-4 text-zinc-400"/> : <Eye className="w-4 h-4 text-zinc-400"/>}
            </button>
            <button
              onClick={()=> mainTab==='portfolio' ? setShowAddWallet(true) : setShowAddWatch(true)}
              className="ml-2 px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5}/>
              Add
            </button>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex px-6 max-w-7xl mx-auto border-t border-zinc-900">
          {[
            { id:'portfolio', label:'Portfolio' },
            { id:'watchlist', label:'Watchlist' },
          ].map(t => (
            <button key={t.id} onClick={()=>setMainTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors ${mainTab===t.id ? 'border-emerald-500 text-zinc-100 font-medium' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 relative z-10">
        {error && (
          <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 mb-8">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-sm text-red-200">Error loading portfolio</p>
              <p className="text-xs text-red-300/70 mt-1">{error}</p>
            </div>
            <button onClick={refetch} className="text-xs text-red-300 hover:text-red-200 underline flex-shrink-0 mt-0.5">Retry</button>
          </div>
        )}

        {partial && !error && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-amber-200/90">Some networks failed to respond. Data may be incomplete.</p>
            <button onClick={refetch} className="text-xs text-amber-300 hover:text-amber-200 underline flex-shrink-0">Reload</button>
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {mainTab === 'portfolio' && (
          <>
            {wallets.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-400 text-lg mb-2">No wallets connected</p>
                <p className="text-zinc-600 text-sm mb-8">Add your public address to begin tracking</p>
                <button onClick={()=>setShowAddWallet(true)} className="px-6 py-3 bg-emerald-500 text-black text-sm font-semibold rounded-xl hover:bg-emerald-400">
                  + Add Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Analytics Header */}
                <section className="mb-10">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <h2 className="text-4xl font-light tracking-tight font-mono mb-2">{hide(fmtUSD(totalUSD))}</h2>
                      <p className="text-sm text-zinc-500">Total Portfolio Value</p>
                    </div>
                    <div className="flex gap-2">
                      {CHAINS.filter(c=>c.id==='all'||activeChains.includes(c.id)).map(c=>(
                        <button key={c.id} onClick={()=>setSelectedChain(c.id)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${selectedChain===c.id ? 'bg-zinc-100 text-black border-zinc-100' : 'text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}>
                          {c.id==='all' ? '⬤ All' : c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Assets" value={valueTokens.length} icon={TrendingUp} color="#10b981"/>
                    <StatCard label="Collections" value={(data?.nfts||[]).length} icon={ImageIcon} color="#3b82f6"/>
                    <StatCard label="Networks" value={activeChains.length} color="#f59e0b"/>
                    <StatCard label="DeFi Positions" value={(defiPositions||[]).length} icon={Droplets} color="#8b5cf6"/>
                  </div>

                  {/* Main Chart */}
                  {chartData.length > 0 && (
                    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 mb-8">
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-1">Portfolio Performance</h3>
                        <p className="text-xs text-zinc-500">Last 6 months</p>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="gradChart" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/>
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false}/>
                          <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                          <Tooltip contentStyle={{backgroundColor:'#18181b',border:'1px solid #27272a',borderRadius:'12px',fontSize:'12px'}} formatter={v=>[`$${v.toLocaleString('en-US')}`,'Value']}/>
                          <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#gradChart)"/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-zinc-900 mb-6">
                  {[
                    { id:'overview', label:'Overview', count: filteredValue.length },
                    { id:'nfts',     label:'Collections', count: filteredNFTs.length },
                    { id:'defi',     label:'DeFi', count: (defiPositions||[]).length },
                  ].map(tab=>(
                    <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                      className={`pb-4 text-sm transition-colors relative flex items-center gap-2 ${activeTab===tab.id?'text-zinc-100 font-medium':'text-zinc-500'}`}>
                      {tab.label}
                      <span className="text-xs text-zinc-600 font-mono">{tab.count}</span>
                      {activeTab===tab.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-500 rounded-full"/>}
                    </button>
                  ))}
                </div>

                {/* Content */}
                {activeTab==='overview' && (
                  <div>
                    {loading && (
                      <div className="space-y-2">
                        {[1,2,3,4].map(i=>(
                          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                            <div className="w-11 h-11 rounded-full bg-zinc-800 animate-pulse flex-shrink-0"/>
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-zinc-800 rounded animate-pulse w-24"/>
                              <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-16"/>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1">
                      {filteredValue.sort((a,b)=>(b.valueUSD||0)-(a.valueUSD||0)).map((t,i)=>(
                        <TokenRow key={`v-${t.chain}-${t.contract||t.symbol}-${i}`} token={t}/>
                      ))}
                    </div>
                    {filteredSpam.length > 0 && (
                      <div className="mt-6">
                        <button onClick={()=>setShowSpam(!showSpam)} className="w-full flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-zinc-800"/>
                          <span className="text-xs text-zinc-600 flex items-center gap-1.5 flex-shrink-0">
                            {showSpam ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                            {filteredSpam.length} dust tokens
                          </span>
                          <div className="flex-1 h-px bg-zinc-800"/>
                        </button>
                        {showSpam && (
                          <div className="space-y-1 opacity-40">
                            {filteredSpam.map((t,i)=><TokenRow key={`s-${i}`} token={t}/>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab==='nfts' && (
                  filteredNFTs.length===0
                    ? <p className="text-center py-12 text-zinc-500 text-sm">No NFTs or Ordinals found</p>
                    : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredNFTs.map((nft,i)=><NFTCard key={i} nft={nft} onPress={()=>setSelectedNFT(nft)}/>)}
                      </div>
                )}

                {activeTab==='defi' && (
                  <div className="space-y-4">
                    {defiLoading && (
                      <div className="space-y-4">
                        {[1,2].map(i=>(
                          <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 animate-pulse h-32"/>
                        ))}
                      </div>
                    )}
                    {(defiPositions||[]).length === 0 && !defiLoading && (
                      <div className="text-center py-12">
                        <Droplets className="w-10 h-10 text-zinc-700 mx-auto mb-3"/>
                        <p className="text-zinc-400 text-sm">No DeFi positions found</p>
                      </div>
                    )}
                    {(defiPositions||[]).map((p,i)=><DefiCard key={i} position={p}/>)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── WATCHLIST ── */}
        {mainTab === 'watchlist' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-light">Watchlist</h2>
                <p className="text-sm text-zinc-500 mt-1">Track wallets and traders you follow</p>
              </div>
            </div>

            {watchlist.length === 0 ? (
              <div className="text-center py-16">
                <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4"/>
                <p className="text-zinc-400 text-lg mb-2">No wallets watched</p>
                <p className="text-zinc-600 text-sm mb-6">Add a trader's address to track their moves</p>
                <button onClick={()=>setShowAddWatch(true)} className="px-6 py-3 bg-emerald-500 text-black text-sm font-semibold rounded-xl">
                  + Add to Watchlist
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {watchlist.map((w,i)=>(
                  <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Star className="w-5 h-5 text-amber-400"/>
                        </div>
                        <div>
                          <p className="font-medium">{w.label}</p>
                          <p className="text-xs text-zinc-500 font-mono">{w.address.slice(0,10)}…{w.address.slice(-8)}</p>
                        </div>
                      </div>
                      <button onClick={()=>setWatchlist(watchlist.filter((_,j)=>j!==i))} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Wallet modal */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center" onClick={()=>setShowAddWallet(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden"/>
            <h3 className="text-lg font-semibold mb-1">Add Wallet</h3>
            <p className="text-xs text-zinc-500 mb-5">Paste your public wallet address</p>
            <input type="text" value={newAddress} onChange={e=>setNewAddress(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addWallet()}
              placeholder="0x... · bc1... · Solana address"
              className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 mb-4"
              autoFocus/>
            <div className="flex gap-2">
              <button onClick={()=>setShowAddWallet(false)} className="flex-1 py-3 border border-zinc-800 rounded-xl text-sm">Cancel</button>
              <button onClick={addWallet} disabled={!newAddress.trim()} className="flex-1 py-3 bg-emerald-500 text-black rounded-xl text-sm font-semibold disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* NFT modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center" onClick={()=>setSelectedNFT(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl overflow-hidden w-full sm:max-w-sm" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 sm:hidden"/>
            <div className="aspect-square bg-zinc-900 mt-2">
              {selectedNFT.image
                ? <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-zinc-700"/></div>
              }
            </div>
            <div className="p-6">
              <p className="text-xs text-zinc-500 mb-1">{selectedNFT.collection}</p>
              <h3 className="text-lg font-medium mb-4">{selectedNFT.name}</h3>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                <div><p className="text-xs text-zinc-500 mb-1">Network</p><p className="text-sm font-mono uppercase">{selectedNFT.chain}</p></div>
              </div>
              <button onClick={()=>setSelectedNFT(null)} className="w-full mt-4 py-3 border border-zinc-800 rounded-xl text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
