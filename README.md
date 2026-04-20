# Keto App

> Frontend do [Keto](https://github.com/oguilhermeleite/Keto) — Portfolio tracker cripto multi-chain.

Dashboard dark minimalista em React + Vite + Tailwind. Consome a API do backend Keto pra mostrar saldos, tokens e NFTs agregados de todas as carteiras.

## Setup

```bash
npm install
cp .env.example .env
# edita .env com a URL do teu backend Keto
npm run dev
```

## Stack

- React 18 + Vite
- Tailwind CSS
- Recharts (gráficos)
- Lucide React (ícones)
- Fonts: Geist + Geist Mono

## Deploy no Vercel

1. Importa o repositório em vercel.com/new
2. Framework: **Vite** (detectado automaticamente)
3. Environment Variables:
   - `VITE_KETO_API` = URL do teu backend em produção
4. Deploy

## Como funciona

- Carteiras adicionadas ficam salvas no **localStorage** do navegador — não vai pra nenhum servidor
- O app chama o backend Keto, que por sua vez chama Alchemy/Helius/Blockstream
- Sem backend rodando, o app mostra modo demonstração com dados mock
- Read-only: nunca pede private key, seed phrase ou conexão de carteira

## Licença

MIT
