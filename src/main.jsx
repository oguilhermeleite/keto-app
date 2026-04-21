import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initSentry, Sentry } from './lib/sentry'
import './index.css'

initSentry();

const ErrorFallback = () => (
  <div style={{minHeight:'100vh',background:'#09090b',color:'#f4f4f5',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:'Geist, system-ui, sans-serif'}}>
    <div style={{textAlign:'center',maxWidth:'400px'}}>
      <div style={{width:'48px',height:'48px',borderRadius:'12px',background:'linear-gradient(135deg,#34d399,#059669)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'20px',fontWeight:700,color:'#09090b'}}>K</div>
      <h1 style={{fontSize:'18px',marginBottom:'8px',fontWeight:600}}>Algo deu errado</h1>
      <p style={{fontSize:'13px',color:'#a1a1aa',marginBottom:'20px'}}>Já fomos notificados. Tenta recarregar a página.</p>
      <button onClick={()=>window.location.reload()} style={{padding:'10px 20px',background:'#10b981',color:'#09090b',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
        Recarregar
      </button>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback/>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
