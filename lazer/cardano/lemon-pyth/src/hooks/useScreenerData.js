import { useState, useEffect, useMemo, useRef } from 'react';
import { BLACKLIST, MARKET_RULES } from '../config/marketRules';

export const useScreenerData = (activeSector, activeExchange) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'volume', direction: 'desc' });

    const marketMap = useRef(new Map());
    const wsRef = useRef(null);
    const fastInterval = useRef(null);
    const slowInterval = useRef(null);

    useEffect(() => {
        let isMounted = true;
        
        setData([]); 
        marketMap.current.clear();
        setIsLoading(true);

        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        if (fastInterval.current) clearInterval(fastInterval.current);
        if (slowInterval.current) clearInterval(slowInterval.current);

        if (activeSector === 'crypto' && activeExchange === 'binance') {
            
            // --- URL DEL BACKEND (Django) ---
            // En local usa localhost, en producción usa tu dominio
            const isLocal = window.location.hostname.includes('localhost');
            const BACKEND_API = isLocal 
                ? 'http://127.0.0.1:8000/api/engine/market-data/?sector=crypto' 
                : 'https://api.szoficial.com/api/engine/market-data/?sector=crypto';
            
            const BINANCE_API = 'https://fapi.binance.com/fapi';

            // --- PROCESAMIENTO INICIAL ---
            const processItem = (item) => {
                const high = parseFloat(item.highPrice || item.h || 0);
                const low = parseFloat(item.lowPrice || item.l || 0);
                const currentPrice = parseFloat(item.lastPrice || item.c || 0);
                const vol = parseFloat(item.quoteVolume || item.q || 0);
                
                // VLT Diaria
                const vlt = low > 0 ? ((high - low) / low) * 100 : 0;

                return {
                    symbol: item.symbol || item.s,
                    price: currentPrice,
                    change: parseFloat(item.priceChangePercent || item.P || 0),
                    volume: vol,
                    trades: parseInt(item.count || item.n || 0),
                    vlt: vlt,
                    // CORRECCIÓN: OI empieza en 0, NO usamos volumen como proxy
                    oi: 0, 
                    high: high,
                    low: low,
                    funding: 0
                };
            };

            // --- 1. CARGA INICIAL (REST RÁPIDO) ---
            const init = async () => {
                try {
                    const res = await fetch(`${BINANCE_API}/v1/ticker/24hr`);
                    if (!res.ok) throw new Error("API Error");
                    const raw = await res.json();
                    
                    if (!isMounted) return;

                    const processed = raw
                        .filter(item => {
                            const vol = parseFloat(item.quoteVolume);
                            return item.symbol.endsWith(MARKET_RULES.allowedQuote) && 
                                   !item.symbol.includes('_') && 
                                   !BLACKLIST.includes(item.symbol) &&
                                   vol > MARKET_RULES.minVolume24h;
                        })
                        .map(processItem);

                    processed.forEach(p => marketMap.current.set(p.symbol, p));
                    setData(processed);
                    setIsLoading(false);

                    connectWebSocket();
                    startUpdateLoops();
                    // Llamamos al backend inmediatamente para llenar el OI
                    fetchBackendData(); 

                } catch (e) {
                    console.error("Init Error", e);
                    if (isMounted) setIsLoading(false);
                }
            };

            // --- 2. WEBSOCKET (TIEMPO REAL: SOLO PRECIO/VOL) ---
            const connectWebSocket = () => {
                const ws = new WebSocket('wss://fstream.binance.com/stream?streams=!ticker@arr');
                wsRef.current = ws;

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const msg = JSON.parse(event.data);
                        const payload = msg.data;
                        if (!Array.isArray(payload)) return;

                        payload.forEach(u => {
                            const symbol = u.s;
                            if (marketMap.current.has(symbol)) {
                                const oldItem = marketMap.current.get(symbol);
                                const newItem = processItem(u);
                                
                                // CORRECCIÓN: Preservamos el OI y Funding del ciclo lento
                                // El WebSocket NO trae estos datos, así que no debemos sobrescribirlos con 0
                                newItem.oi = oldItem.oi; 
                                newItem.funding = oldItem.funding; 
                                
                                marketMap.current.set(symbol, newItem);
                            }
                        });
                    } catch (e) { }
                };

                ws.onclose = () => {
                    if (isMounted) setTimeout(connectWebSocket, 2000);
                };
            };

            // --- 3. CICLO LENTO (BACKEND DJANGO -> OI REAL) ---
            const fetchBackendData = async () => {
                try {
                    // Pedimos al Backend que calcule OI y Funding reales
                    const res = await fetch(BACKEND_API);
                    if (!res.ok) return;
                    const advancedData = await res.json();
                    
                    if (!isMounted) return;

                    advancedData.forEach(item => {
                        const symbol = item.symbol;
                        if (marketMap.current.has(symbol)) {
                            const current = marketMap.current.get(symbol);
                            
                            // Inyectamos los datos avanzados en la memoria del Frontend
                            current.oi = item.oi;         // OI Real desde CCXT
                            current.funding = item.funding; 
                            current.vlt = item.vlt_24h;   // VLT calculada por backend (opcional)
                            
                            // No necesitamos llamar a setData aquí, el loop rápido lo recogerá
                        }
                    });
                } catch (e) {
                    console.error("Error Backend:", e);
                }
            };

            // --- 4. BUCLES DE UI ---
            const startUpdateLoops = () => {
                
                // RÁPIDO (5s): Refresco visual
                fastInterval.current = setInterval(() => {
                    if (!isMounted) return;

                    setData(prevData => {
                        return prevData.map(renderedItem => {
                            const fresh = marketMap.current.get(renderedItem.symbol);
                            if (!fresh) return renderedItem;

                            // Actualizamos si cambia precio, volumen O si llegó data nueva del backend (OI)
                            if (fresh.price !== renderedItem.price || fresh.oi !== renderedItem.oi) {
                                return { ...fresh }; 
                            }
                            return renderedItem;
                        });
                    });
                }, 5000);

                // LENTO (60s): Recargar OI/Funding desde Django
                slowInterval.current = setInterval(() => {
                    if (!isMounted) return;
                    fetchBackendData();
                }, 60000);
            };

            init();

        } else {
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
            if (wsRef.current) wsRef.current.close();
            if (fastInterval.current) clearInterval(fastInterval.current);
            if (slowInterval.current) clearInterval(slowInterval.current);
            marketMap.current.clear();
        };
    }, [activeSector, activeExchange]);

    const sortedData = useMemo(() => {
        const items = [...data];
        if (sortConfig.key) {
            items.sort((a, b) => {
                const aVal = a[sortConfig.key] || 0;
                const bVal = b[sortConfig.key] || 0;
                if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }
        return items;
    }, [data, sortConfig]);

    const requestSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    };

    return { data: sortedData, isLoading, requestSort, sortConfig };
};