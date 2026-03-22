import React, { useState, useMemo } from 'react';
import ScreenerTable from '../../components/screener/ScreenerTable';
import SmartSupplyPanel from '../../services/SmartSupplyPanel'; 
import OrderBook from '../../components/screener/OrderBook';
import { usePriceAggregator } from '../../hooks/usePriceAggregator';

const Screener = () => {
    const { data, isLoading, status } = usePriceAggregator();
    const [selectedAsset, setSelectedAsset] = useState(null);

    // FIX: Función segura para símbolos de TradingView
    const getChartSymbol = (symbol) => {
        if (!symbol) return "BTCUSDT";
        const clean = symbol.replace('/', '').toUpperCase();
        // Si es RWA, usamos el feed de TVC (TradingView Chart)
        return symbol.includes('USD') && !symbol.includes('USDT') ? `TVC:${clean}` : `BINANCE:${clean}PERP`;
    };

    // CREATIVIDAD: Lógica MRAR integrada (Clasificación de Regímenes en tiempo real)
    const processedData = useMemo(() => {
        return data.map(asset => ({
            ...asset,
            // Clasificación MRAR simple basada en Gap y Confianza
            regime: asset.gap > 0.05 ? 'BULLISH' : asset.gap < -0.05 ? 'BEARISH' : 'LATERAL',
            volatility: asset.confidence > 0.1 ? 'HIGH' : 'LOW'
        }));
    }, [data]);

    return (
        <div className="flex w-full h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans">
            
            {/* PANEL CENTRAL */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
                
                {/* HEADER PRO */}
                <header className="p-4 border-b border-white/5 flex justify-between items-center bg-[#080808]/80 backdrop-blur-md z-50">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img src="/img/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl border border-white/10 shadow-2xl shadow-yellow-500/10" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#050505] rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
                                Lemon<span className="text-yellow-500">Pyth</span> <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded ml-2 not-italic font-mono text-slate-400">V2.0</span>
                            </h1>
                            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                                <span className="text-blue-400">ORACLE: {status || 'CONNECTED'}</span>
                                <span>•</span>
                                <span>RWA LEDGER ACTIVE</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                        <div className="hidden xl:flex flex-col items-end font-mono text-[10px]">
                            <span className="text-slate-600 uppercase">Cardano Policy ID</span>
                            <span className="text-blue-400/80 tracking-widest">d799d287105...a800a21e6</span>
                        </div>
                    </div>
                </header>
                
                {/* TABLA: Mitad Superior */}
                <section className={`w-full transition-all duration-700 ease-in-out ${selectedAsset ? 'h-[45%]' : 'h-full'}`}>
                    <ScreenerTable 
                        data={processedData} 
                        isLoading={isLoading} 
                        onSelectAsset={setSelectedAsset} 
                    />
                </section>

                {/* VISUALIZADOR: Mitad Inferior */}
                {selectedAsset && (
                    <div className="flex-1 w-full flex bg-black overflow-hidden border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex-1 relative">
                            <iframe 
                                src={`https://s.tradingview.com/widgetembed/?symbol=${getChartSymbol(selectedAsset.symbol)}&interval=1&theme=dark&style=1&timezone=Etc%2FUTC&overrides=%7B%22paneProperties.background%22%3A%22%23050505%22%7D`} 
                                className="w-full h-full border-none opacity-80 hover:opacity-100 transition-opacity" 
                                title={selectedAsset.symbol}
                            ></iframe>
                            
                            {/* Overlay de información del activo seleccionado */}
                            <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg pointer-events-none">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">MRAR Analysis</div>
                                <div className="text-sm font-black text-yellow-500">{selectedAsset.regime} REGIME</div>
                            </div>
                        </div>
                        
                        <aside className="w-72 border-l border-white/5 hidden 2xl:block">
                            <OrderBook 
                                symbol={selectedAsset.symbol?.toLowerCase() || 'btc'} 
                                pythPrice={selectedAsset.pythPrice} 
                            />
                        </aside>
                    </div>
                )}
            </div>

            {/* SIDEBAR DERECHO (SMART SUPPLY) */}
            <aside className="w-80 bg-[#080808] flex-shrink-0 hidden lg:flex flex-col border-l border-white/5">
                 <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                     <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                        Peg Defense
                     </h2>
                     {selectedAsset && (
                         <button onClick={() => setSelectedAsset(null)} className="text-[9px] text-slate-500 hover:text-white transition-colors">CLOSE ×</button>
                     )}
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <SmartSupplyPanel realData={data} isLoading={isLoading} selected={selectedAsset} /> 
                 </div>
            </aside>
        </div>
    );
};

export default Screener;