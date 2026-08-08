import { useEffect, useRef } from 'react';

// 🔥 Asegúrate de que este archivo exista en tu carpeta /public/img/logo.svg
const ORIGINAL_FAVICON_PATH = '/img/logo.svg'; 

const updateFavicon = (imgBase, color) => {
    if (!imgBase) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(imgBase, 0, 0, 32, 32);

    if (color) {
        const x = 24; 
        const y = 24; 
        const radius = 5;

        ctx.beginPath();
        ctx.arc(x, y, radius + 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#0b0e11'; 
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL("image/x-icon");
    
    const head = document.getElementsByTagName('head')[0];
    const oldLinks = document.querySelectorAll("link[rel*='icon']");
    oldLinks.forEach(el => el.remove());
    
    head.appendChild(link);
};

export const useTabTicker = (symbol) => {
    const wsRef = useRef(null);
    const lastPriceRef = useRef(0);
    const faviconImgRef = useRef(null);
    const lastColorRef = useRef(null);

    // 1. Cargar imagen al montar
    useEffect(() => {
        const img = new Image();
        img.src = ORIGINAL_FAVICON_PATH;
        img.crossOrigin = "anonymous"; 
        img.onload = () => {
            faviconImgRef.current = img;
            updateFavicon(img, null);
        };
        img.onerror = () => {
            console.warn("⚠️ No se encontró el logo en:", ORIGINAL_FAVICON_PATH);
        };
    }, []);

    // 2. Conexión WS
    useEffect(() => {
        if (!symbol) return;

        // Limpiar conexión previa si existe
        if (wsRef.current) {
            wsRef.current.close();
        }

        const cleanSymbol = symbol.replace('BINANCE:', '').toLowerCase();
        const wsUrl = `wss://fstream.binance.com/ws/${cleanSymbol}@ticker`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (!data.c) return;

                const price = parseFloat(data.c);
                const prevPrice = lastPriceRef.current;

                const formattedPrice = price.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
                
                const arrow = prevPrice === 0 ? '•' : (price > prevPrice ? '▲' : price < prevPrice ? '▼' : '•');
                document.title = `${arrow} ${formattedPrice} | ${cleanSymbol.toUpperCase()}`;

                if (prevPrice !== 0 && price !== prevPrice && faviconImgRef.current) {
                    const newColor = price > prevPrice ? '#00ff88' : '#ff4466';
                    
                    if (newColor !== lastColorRef.current) {
                        updateFavicon(faviconImgRef.current, newColor);
                        lastColorRef.current = newColor;
                    }
                }

                lastPriceRef.current = price;
            } catch (error) {
                console.error("Ticker Error:", error);
            }
        };

        // --- SOLUCIÓN: La función de limpieza debe estar aquí dentro ---
        return () => {
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.close();
                } else if (wsRef.current.readyState === WebSocket.CONNECTING) {
                    wsRef.current.onopen = () => wsRef.current.close();
                }
            }
            document.title = "SZ Terminal";
            if (faviconImgRef.current) updateFavicon(faviconImgRef.current, null);
        };

    }, [symbol]); // El efecto se reinicia cuando cambia el símbolo
};