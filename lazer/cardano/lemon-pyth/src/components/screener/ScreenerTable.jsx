import React, { memo, useRef, useEffect } from 'react';

const ScreenerTable = memo(({ data, isLoading, onSelectAsset }) => {
    const prevPrices = useRef({});

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#050505]">
                <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">
                    Sincronizando Oráculo Pyth Lazer...
                </span>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0a] custom-scrollbar border-t border-white/5">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5">
                    <tr className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                        <th className="px-6 py-4">Instrumento / Red</th>
                        <th className="px-6 py-4">Pyth Oracle Price</th>
                        <th className="px-6 py-4">CEX Index (Binance)</th>
                        <th className="px-6 py-4">Arbitrage Gap</th>
                        <th className="px-6 py-4 text-center">Confidence</th>
                        <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-[12px] divide-y divide-white/[0.02]">
                    {data.map((row, index) => {
                        // FIX: Generación de key única e indestructible
                        const rowKey = row.symbol || row.hex || `row-${index}`;
                        const price = row.pythPrice ?? 0;
                        const extPrice = row.extPrice ?? 0;
                        const isBullish = row.regime === 'BULLISH';

                        return (
                            <tr 
                                key={rowKey} 
                                onClick={() => onSelectAsset(row)}
                                className="group hover:bg-white/[0.03] transition-colors cursor-pointer relative"
                            >
                                {/* Instrumento */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-sm tracking-tighter">{row.symbol}</span>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-sm border font-bold ${
                                                isBullish ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'
                                            }`}>
                                                {row.regime || 'LATERAL'}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-slate-600 uppercase mt-1">
                                            {row.network || 'Mainnet'} • {row.type || 'Crypto'}
                                        </span>
                                    </div>
                                </td>
                                
                                {/* Precio Oráculo */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-blue-400 font-bold text-sm tabular-nums">
                                            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </span>
                                        <span className="text-[8px] text-slate-500 uppercase">Pyth Hermes V2</span>
                                    </div>
                                </td>

                                {/* Precio CEX (Binance) */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-medium text-sm tabular-nums opacity-80">
                                            ${extPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[8px] text-slate-500 uppercase">Binance Spot</span>
                                    </div>
                                </td>

                                {/* Gap de Arbitraje */}
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold ${
                                        row.gap > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                                    }`}>
                                        <span className="text-[8px]">{row.gap > 0 ? '▲' : '▼'}</span>
                                        <span className="tabular-nums">{Math.abs(row.gap || 0).toFixed(3)}%</span>
                                    </div>
                                </td>

                                {/* Confianza */}
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-slate-400 text-xs">±{(row.confidence || 0).toFixed(4)}</span>
                                        <span className="text-[8px] text-slate-600 uppercase">Interval</span>
                                    </div>
                                </td>

                                {/* Estado del Ledger */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Verified</span>
                                            <div className="relative flex h-2 w-2">
                                                {row.isFresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${row.isFresh ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            </div>
                                        </div>
                                        <span className="text-[8px] text-slate-700 uppercase">Lat: 200ms</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});

export default ScreenerTable;