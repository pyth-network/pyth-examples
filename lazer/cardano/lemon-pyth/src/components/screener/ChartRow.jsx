import React from 'react';

const ChartRow = ({ symbol }) => {
  const getWidgetUrl = (sym) => {
    const cleanSymbol = `BINANCE:${sym}PERP`;
    const params = new URLSearchParams({
      symbol: cleanSymbol, 
      interval: "60", 
      hidesidetoolbar: "1", 
      symboledit: "0", 
      saveimage: "0",
      toolbarbg: "0a0a0a", 
      studies: "[]", 
      theme: "dark", 
      style: "1", 
      timezone: "Etc/UTC",
      overrides: JSON.stringify({
        "paneProperties.background": "#0a0a0a", 
        "scalesProperties.backgroundColor": "#0a0a0a",
      }),
      enabled_features: JSON.stringify(["hide_left_toolbar_by_default"]),
      disabled_features: JSON.stringify([
          "header_symbol_search", "header_compare", "display_market_status", "volume_force_overlay", "left_toolbar", "header_widget", "timeframes_toolbar"
      ]),
      locale: "en"
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  };

  return (
    <tr className="bg-[#0a0a0a] border-b border-[#1a1a1a]">
      {/* 14 columnas para asegurar ancho */}
      <td colSpan={14} className="p-0 border-none h-[400px]">
        <div className="w-full h-full bg-[#0a0a0a] relative">
            <iframe 
                src={getWidgetUrl(symbol)} 
                className="w-full h-full border-none absolute inset-0"
                allowtransparency="true" 
                loading="lazy" 
                title={symbol}
            />
        </div>
      </td>
    </tr>
  );
};

export default React.memo(ChartRow, (prev, next) => prev.symbol === next.symbol);