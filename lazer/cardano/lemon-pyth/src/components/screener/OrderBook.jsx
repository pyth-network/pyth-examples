import React, { useState, useEffect } from 'react';

const OrderBook = ({ symbol = 'BTC/USD', pythPrice = 0 }) => {
    const [bids, setBids] = useState([]);
    const [asks, setAsks] = useState([]);
    const [status, setStatus] = useState('connecting');

    useEffect(() => {
        // 1. Formateo estricto para Binance: "BTC/USD" -> "btcusdt"
        const base = symbol.split('/')[0].toLowerCase();
        const cleanSymbol = `${base}usdt`;
        
        console.log(`📡 Intentando conectar Binance WebSocket: ${cleanSymbol}`);
        
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${cleanSymbol}@depth20@100ms`);

        ws.onopen = () => setStatus('connected');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.bids && data.asks) {
                setBids(data.bids.slice(0, 12));
                setAsks(data.asks.slice(0, 12).reverse()); 
            }
        };

        ws.onerror = (err) => {
            console.error(`❌ Error en Binance WS (${cleanSymbol}):`, err);
            setStatus('error');
        };

        ws.onclose = () => setStatus('disconnected');

        return () => ws.close();
    }, [symbol]); // Se reconecta automáticamente al cambiar de activo

    const calcDepth = (amount, totalList) => {
        if (totalList.length === 0) return 0;
        const maxVol = Math.max(...totalList.map(item => parseFloat(item[1])));
        return (parseFloat(amount) / maxVol) * 100;
    };

    return (
        <div className="w-full h-full bg-[#0a0a0a] flex flex-col font-mono text-[10px] border-l border-white/5">
            <div className="flex justify-between p-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex flex-col">
                    <span className="text-gray-400 uppercase font-bold tracking-tighter">
                        {symbol} Orderbook
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase">Source: Binance CEX</span>
                </div>
                <div className="text-right">
                    <span className="text-blue-400 block font-bold">
                        PYTH: ${pythPrice > 0 ? pythPrice.toLocaleString(undefined, {minimumFractionDigits: 2}) : '---'}
                    </span>
                    <span className={`text-[7px] ${status === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                        {status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-2 gap-1 overflow-hidden">
                {/* Cabeceras de tabla */}
                <div className="flex justify-between text-gray-600 mb-2 px-2 text-[9px] uppercase tracking-widest font-black">
                    <span>Price (USDT)</span>
                    <span>Size</span>
                </div>

                {/* ASKS (Ventas) */}
                <div className="flex flex-col gap-[1px]">
                    {asks.length > 0 ? asks.map((ask, i) => (
                        <div key={`ask-${i}`} className="relative flex justify-between px-2 py-0.5 group">
                            <div 
                                className="absolute right-0 top-0 h-full bg-red-500/10 transition-all duration-300"
                                style={{ width: `${calcDepth(ask[1], asks)}%` }}
                            ></div>
                            <span className="text-red-500/80 relative z-10 font-bold">{parseFloat(ask[0]).toFixed(2)}</span>
                            <span className="text-gray-500 relative z-10">{parseFloat(ask[1]).toFixed(3)}</span>
                        </div>
                    )) : <div className="h-32 flex items-center justify-center text-slate-700 italic">No Ask Data</div>}
                </div>

                {/* SPREAD INDICATOR */}
                <div className="py-2 flex items-center justify-center border-y border-white/5 my-1 bg-white/[0.01]">
                    {asks.length > 0 && bids.length > 0 ? (
                        <div className="flex flex-col items-center">
                            <span className="text-gray-500 text-[9px] uppercase tracking-tighter">Spread</span>
                            <span className="text-white font-bold">${(parseFloat(asks[asks.length-1][0]) - parseFloat(bids[0][0])).toFixed(2)}</span>
                        </div>
                    ) : <span className="text-gray-700 animate-pulse font-black">SYNCING LIQUIDITY...</span>}
                </div>

                {/* BIDS (Compras) */}
                <div className="flex flex-col gap-[1px]">
                    {bids.length > 0 ? bids.map((bid, i) => (
                        <div key={`bid-${i}`} className="relative flex justify-between px-2 py-0.5 group">
                            <div 
                                className="absolute right-0 top-0 h-full bg-green-500/10 transition-all duration-300"
                                style={{ width: `${calcDepth(bid[1], bids)}%` }}
                            ></div>
                            <span className="text-green-500/80 relative z-10 font-bold">{parseFloat(bid[0]).toFixed(2)}</span>
                            <span className="text-gray-500 relative z-10">{parseFloat(bid[1]).toFixed(3)}</span>
                        </div>
                    )) : <div className="h-32 flex items-center justify-center text-slate-700 italic">No Bid Data</div>}
                </div>
            </div>
        </div>
    );
};

export default OrderBook;