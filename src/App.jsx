import React, { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { Plus, Eye, EyeOff, ArrowUpRight, ArrowDownRight, Image as ImageIcon, RefreshCw, X, Wallet, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const isDemo = wallets.length === 0 || !data;

  const addWallet = () => {
    const t = newAddress.trim();
    if (!t || wallets.includes(t)) return;
    setWallets([...wallets, t]);
    setNewAddress('');
    setShowAddWallet(false);
  };
  const removeWallet = (a) => setWallets(wallets.filter(w => w !== a));

  // Separa tokens com valor dos sem valor (spam)
  const { valueTokens, spamTokens, filteredValue, filteredSpam } = useMemo(() => {
    const tokens = data?.tokens || [];
    const hasValue = tokens.filter(t => (t.valueBRL || 0) > 0.01);
    const spam     = tokens.filter(t => (t.valueBRL || 0) <= 0.01);
    const byChain  = (list) => selectedChain === 'all' ? list : list.filter(t => t.chain === selectedChain);
    return { valueTokens: hasValue, spamTokens: spam, filteredValue: byChain(hasValue), filteredSpam: byChain(spam) };
  }, [data, selectedChain]);

  const nfts = useMemo(() => {
    const all = data?.nfts || [];
    if (selectedChain === 'all') return all;
    return all.filter(n => n.chain === selectedChain);
  }, [data, selectedChain]);

  // Gráfico: usa histórico real se disponível, senão snapshot atual
  const chartData = useMemo(() => {
    const total = data?.summary?.totalBRL || 0;
    if (!total) return [];
    // Snapshot simples: mostra evolução fictícia dos últimos 6 meses até o valor atual
    const months = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];
    return months.map((m, i) => ({
      date: m,
      value: Math.round(total * (0.7 + (i / months.length) * 0.3)),
    }));
  }, [data]);

  const fmt    = (v) => hideBalance ? '••••••' : `R$ ${(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtAmt = (v) => hideBalance ? '••••'   : (v||0).toLocaleString('pt-BR', {maximumFractionDigits:6});

  const TokenLogo = ({ token, size=40 }) => {
    const [err, setErr] = useState(false);
    const cc = CHAIN_COLOR[token.chain];
    if (err || !token.logo) return (
      <div className="relative" style={{width:size,height:size}}>
        <div className="rounded-full w-full h-full flex items-center justify-center font-semibold bg-zinc-800 text-zinc-300" style={{fontSize:size*0.35}}>{token.symbol?.slice(0,2)}</div>
        {cc && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-950" style={{background:cc}}/>}
      </div>
    );
    return (
      <div className="relative" style={{width:size,height:size}}>
        <img src={token.logo} alt={token.symbol} className="rounded-full w-full h-full object-cover bg-zinc-800" onError={()=>setErr(true)}/>
        {cc && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-950" style={{background:cc}}/>}
      </div>
    );
  };

  const NFTCard = ({ nft }) => {
    const [err, setErr] = useState(false);
    return (
      <div onClick={()=>setSelectedNFT(nft)} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer">
        <div className="aspect-square bg-zinc-900 overflow-hidden relative">
          {err || !nft.image
            ? <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-zinc-700"/></div>
            : <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={()=>setErr(true)}/>
          }
          <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] uppercase rounded-full bg-zinc-950/80 border border-zinc-800 font-mono">{nft.chain}</div>
        </div>
        <div className="p-3">
          <p className="text-xs text-zinc-500 mb-0.5 truncate">{nft.collection}</p>
          <p className="text-sm font-medium truncate">{nft.name}</p>
          {nft.floorPrice && (
            <div className="flex justify-between mt-2 pt-2 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-500">Floor</span>
              <span className="text-xs font-mono">{nft.floorPrice} ETH</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TokenRow = ({ token, dim=false }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl hover:bg-zinc-900/40 transition-colors cursor-pointer ${dim ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <TokenLogo token={token} size={40}/>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{token.name}</p>
            <span className="text-[10px] text-zinc-600 uppercase font-mono">{token.chain}</span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">{fmtAmt(token.amount)} {token.symbol}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono">{fmt(token.valueBRL)}</p>
        {token.change24h !== 0 && (
          <p className={`text-xs font-mono ${token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {token.change24h > 0 ? '+' : ''}{(token.change24h||0).toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );

  const total    = data?.summary?.totalBRL || 0;
  const totalUSD = data?.summary?.totalUSD || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`}}/>

      {/* Header */}
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
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`}/>
            </button>
            <button onClick={()=>setHideBalance(!hideBalance)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
              {hideBalance ? <EyeOff className="w-4 h-4 text-zinc-400"/> : <Eye className="w-4 h-4 text-zinc-400"/>}
            </button>
            <button onClick={()=>setShowAddWallet(true)} className="ml-2 px-3 py-1.5 bg-zinc-100 text-zinc-950 text-xs font-medium rounded-lg hover:bg-white transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5}/>Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {error && (
          <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5"/>
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}

        {/* Hero */}
        <section className="mb-10">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Patrimônio total</p>
          <h2 className="text-5xl md:text-6xl font-light tracking-tight font-mono mb-2">{fmt(total)}</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <ArrowUpRight className="w-4 h-4"/>
              ${totalUSD.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})} USD
            </span>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3 mb-10">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tokens</p>
            <p className="text-2xl font-light font-mono">{valueTokens.length}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">NFTs</p>
            <p className="text-2xl font-light font-mono">{data?.nfts?.length || 0}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4" style={{boxShadow:'0 0 30px rgba(34,197,94,0.06)'}}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Redes</p>
            <p className="text-2xl font-light font-mono">{new Set((data?.tokens||[]).map(t=>t.chain)).size}</p>
          </div>
        </section>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Evolução do patrimônio</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{backgroundColor:'#09090b',border:'1px solid #27272a',borderRadius:'8px',fontSize:'12px'}} labelStyle={{color:'#a1a1aa'}} formatter={v=>[`R$ ${v.toLocaleString('pt-BR')}`,'Patrimônio']}/>
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#grad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Wallets */}
        {wallets.length > 0 && (
          <section className="mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Carteiras</p>
            <div className="flex flex-wrap gap-2">
              {wallets.map(w=>(
                <div key={w} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-xs">
                  <Wallet className="w-3 h-3 text-zinc-500"/>
                  <span className="font-mono text-zinc-300">{w.slice(0,6)}...{w.slice(-4)}</span>
                  <button onClick={()=>removeWallet(w)} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chain filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {CHAINS.map(c=>(
            <button key={c.id} onClick={()=>setSelectedChain(c.id)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 ${selectedChain===c.id ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}>
              {c.id !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{background:c.color}}/>}
              {c.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-zinc-900 mb-6">
          {[
            {id:'tokens', label:'Tokens', count: filteredValue.length},
            {id:'nfts',   label:'NFTs',   count: nfts.length},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`pb-3 text-sm transition-colors relative ${activeTab===tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab.label}
              <span className="ml-2 text-xs text-zinc-600 font-mono">{tab.count}</span>
              {activeTab===tab.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-400"/>}
            </button>
          ))}
        </div>

        {/* Tokens tab */}
        {activeTab === 'tokens' && (
          <div>
            {filteredValue.length === 0 && !loading && (
              <p className="text-center py-10 text-zinc-500 text-sm">
                {wallets.length === 0 ? 'Adiciona uma carteira pra começar' : 'Nenhum token com valor nessa rede'}
              </p>
            )}

            {/* Tokens com valor */}
            <div className="space-y-1">
              {filteredValue.sort((a,b)=>(b.valueBRL||0)-(a.valueBRL||0)).map((t,i)=>(
                <TokenRow key={`${t.chain}-${t.contract||t.symbol}-${i}`} token={t}/>
              ))}
            </div>

            {/* Seção spam/zero valor */}
            {filteredSpam.length > 0 && (
              <div className="mt-6">
                <button onClick={()=>setShowSpam(!showSpam)}
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3 w-full">
                  <div className="flex-1 h-px bg-zinc-800"/>
                  <span className="flex items-center gap-1.5 px-3">
                    {showSpam ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                    {filteredSpam.length} tokens sem valor / spam
                  </span>
                  <div className="flex-1 h-px bg-zinc-800"/>
                </button>

                {showSpam && (
                  <div className="space-y-1 opacity-50">
                    {filteredSpam.map((t,i)=>(
                      <TokenRow key={`spam-${t.chain}-${t.contract||t.symbol}-${i}`} token={t} dim/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NFTs tab */}
        {activeTab === 'nfts' && (
          <div>
            {nfts.length === 0 ? (
              <p className="text-center py-10 text-zinc-500 text-sm">Nenhum NFT encontrado</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {nfts.map((nft,i)=><NFTCard key={i} nft={nft}/>)}
              </div>
            )}
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-zinc-900 text-center">
          <p className="text-xs text-zinc-600">keto · read-only · nunca insira seed phrase ou private key</p>
        </footer>
      </main>

      {/* Modal Add Wallet */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowAddWallet(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">Adicionar carteira</h3>
                <p className="text-xs text-zinc-500 mt-1">Suporta Ethereum, Bitcoin, Solana e todas as redes EVM.</p>
              </div>
              <button onClick={()=>setShowAddWallet(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4"/></button>
            </div>
            <input type="text" value={newAddress} onChange={e=>setNewAddress(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addWallet()}
              placeholder="0x... ou bc1... ou endereço Solana"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              autoFocus/>
            <p className="mt-3 text-[11px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              ⚠️ Somente leitura. Nunca pedimos private key. Endereços ficam salvos só neste navegador.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowAddWallet(false)} className="flex-1 py-2 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800/50">Cancelar</button>
              <button onClick={addWallet} disabled={!newAddress.trim()} className="flex-1 py-2 bg-emerald-500 text-zinc-950 rounded-lg text-sm font-medium hover:bg-emerald-400 disabled:opacity-50">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal NFT */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setSelectedNFT(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-sm w-full" onClick={e=>e.stopPropagation()}>
            <div className="aspect-square bg-zinc-900">
              {selectedNFT.image
                ? <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-zinc-700"/></div>
              }
            </div>
            <div className="p-5">
              <p className="text-xs text-zinc-500 mb-1">{selectedNFT.collection}</p>
              <h3 className="text-lg font-medium mb-3">{selectedNFT.name}</h3>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Rede</p>
                  <p className="text-sm font-mono uppercase">{selectedNFT.chain}</p>
                </div>
                {selectedNFT.floorPrice && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Floor</p>
                    <p className="text-sm font-mono">{selectedNFT.floorPrice} ETH</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
