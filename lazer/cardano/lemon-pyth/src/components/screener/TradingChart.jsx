import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const TradingChart = ({ symbol, pythPrice }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();

    useEffect(() => {
        // 1. Inicializar el gráfico
        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: 'solid', color: '#0a0a0a' }, textColor: '#D9D9D9' },
            grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
            crosshair: { mode: 1 },
            timeScale: { timeVisible: true, secondsVisible: false },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e', downColor: '#ef4444', 
            borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
        });

        // Línea horizontal para marcar el Precio actual de Pyth
        const pythLine = candlestickSeries.createPriceLine({
            price: pythPrice || 0,
            color: '#3b82f6', // Azul Pyth
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: 'Pyth Oracle',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // 2. Conectar al WebSocket de Binance (Velas de 1 minuto)
        const wsSymbol = symbol.toLowerCase().replace('/', '');
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_1m`);

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const kline = message.k;
            
            // Formato que requiere lightweight-charts
            const candle = {
                time: kline.t / 1000,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
            };
            seriesRef.current.update(candle);
        };

        // Resize dinámico
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            ws.close();
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [symbol]);

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
            <div className="p-2 border-b border-[#1a1a1a] flex justify-between items-center text-xs font-mono">
                <span className="text-white font-bold">{symbol} <span className="text-gray-500">1m Klines (CEX)</span></span>
                <span className="text-blue-400">Oracle: ${pythPrice.toFixed(4)}</span>
            </div>
            <div ref={chartContainerRef} className="flex-1 w-full" />
        </div>
    );
};

export default TradingChart;