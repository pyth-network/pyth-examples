import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Columns, Ban, X, Command, SlidersHorizontal } from 'lucide-react';

const Toolbar = ({ searchQuery, setSearchQuery, isChartAllowed }) => {
  // --- LÓGICA DEBOUNCE (OPTIMIZADA) ---
  const [localValue, setLocalValue] = useState(searchQuery);
  const inputRef = useRef(null);

  // Sincroniza input local con el global (con espera de 300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== searchQuery) {
        setSearchQuery(localValue);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localValue, setSearchQuery, searchQuery]);

  // Sincroniza si cambia desde fuera
  useEffect(() => {
    if (searchQuery !== localValue) setLocalValue(searchQuery);
    // eslint-disable-next-line
  }, [searchQuery]);

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleChange = (e) => setLocalValue(e.target.value);

  return (
    <div className="h-14 w-full bg-[#050505] border-b border-[#1a1a1a] flex items-center justify-between px-4 z-40 select-none relative">
      
      {/* 1. IZQUIERDA: Identidad + Herramientas de Filtro */}
      <div className="flex items-center gap-4 flex-1">
         {/* Etiqueta Técnica */}
         <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sz-blue shadow-[0_0_5px_rgba(37,99,235,0.8)]"></div>
            <span className="text-[10px] font-mono font-bold text-[#606060] tracking-widest uppercase">
                Asset Explorer
            </span>
         </div>

         {/* Separador */}
         <div className="h-4 w-px bg-[#222] hidden md:block"></div>

         {/* Botones de Acción (Movidos a la izquierda) */}
         <div className="flex gap-1.5">
            <ToolbarButton icon={Filter} tooltip="Filter View" active={false} />
            <ToolbarButton icon={Columns} tooltip="Columns Layout" active={false} />
            <ToolbarButton icon={SlidersHorizontal} tooltip="Settings" active={false} />
         </div>
      </div>

      {/* 2. DERECHA: Buscador + Alertas */}
      <div className="flex items-center justify-end gap-3 flex-1 max-w-lg">
        
        {/* Aviso No Charts (Si aplica) */}
        {!isChartAllowed && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-red-950/10 border border-red-900/30 rounded text-red-500/60 text-[9px] font-mono tracking-wider select-none whitespace-nowrap">
              <Ban size={10} /> <span>NO CHARTS</span>
            </div>
        )}

        {/* --- BUSCADOR (Sin desbordamiento) --- */}
        <div className="relative group w-full max-w-70 transition-all duration-300 focus-within:max-w-87.5">
          {/* Icono Lupa */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search 
              size={13} 
              className={`transition-colors duration-300 ${localValue ? 'text-white' : 'text-[#505050] group-focus-within:text-[#d4d4d4]'}`} 
            />
          </div>

          <input 
            ref={inputRef}
            type="text" 
            name="asset-search" 
            id="asset-search"   
            placeholder="SEARCH ASSET..." 
            value={localValue} 
            onChange={handleChange} 
            className="w-full bg-[#0a0a0a] border border-[#222] hover:border-[#333] rounded-sm py-1.5 pl-9 pr-9 text-[11px] font-medium text-white placeholder-[#404040] focus:outline-none focus:border-[#404040] focus:bg-[#0e0e0e] focus:ring-1 focus:ring-[#222] transition-all uppercase tracking-wide font-mono"
          />

          {/* Botón Clear / Shortcut */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {localValue ? (
              <button onClick={handleClear} className="text-[#606060] hover:text-white transition-colors p-0.5">
                <X size={12} />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-[#151515] rounded border border-[#262626] text-[9px] text-[#404040] font-mono select-none">
                <span className="text-[8px]">⌘</span><span>K</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Componente Botón Estilizado
const ToolbarButton = React.memo(({ icon: Icon, active, tooltip }) => (
  <button 
    title={tooltip}
    className={`
      p-2 rounded-sm border transition-all duration-200 group relative
      ${active 
        ? 'bg-[#1a1a1a] border-[#333] text-white' 
        : 'bg-transparent border-transparent hover:bg-[#111] hover:border-[#222] text-[#505050] hover:text-[#d4d4d4]'}
    `}
  >
    <Icon size={15} strokeWidth={1.5} />
  </button>
));

export default React.memo(Toolbar);