import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Terminal, Home, Activity, Database } from 'lucide-react';

// --- CONFIGURACIÓN DE COLORES POR ECOSISTEMA ---
const getBrandStyles = (id) => {
    switch (id) {
        case 'crypto':
            return { text: 'text-purple-400', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' };
        case 'rwa':
            return { text: 'text-blue-400', glow: 'drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]' };
        case 'all':
            return { text: 'text-yellow-500', glow: 'drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' };
        default:
            return { text: 'text-white', glow: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' };
    }
};

// --- BOTÓN CENTRAL (Adaptado para Móvil y Desktop sin imágenes locales) ---
const FilterButton = ({ id, label, icon: Icon, sector, activeSector, onSelect, compact = false }) => {
    // Para simplificar, asumimos que activeSector es lo que dicta el botón activo
    const isActive = activeSector === id;
    const styles = getBrandStyles(id);

    return (
        <button 
            onClick={() => onSelect(id)} // Solo enviamos el ID del sector seleccionado
            className={`
                relative flex items-center justify-center transition-all duration-300 group outline-none
                ${compact ? 'px-2 py-1.5' : 'px-4 py-2'}
            `}
        >
            <span className={`
                flex items-center gap-2 font-extrabold tracking-widest uppercase font-montserrat transition-all duration-300
                ${compact ? 'text-[9px]' : 'text-[10px] lg:text-[11px]'}
                ${isActive ? `${styles.text} ${styles.glow}` : 'text-gray-600 opacity-60 group-hover:opacity-100 group-hover:text-gray-300'}
            `}>
                <Icon size={compact ? 12 : 14} className={`transition-all duration-300 ${isActive ? styles.glow : ''}`} />
                {label}
            </span>
            
            {isActive && (
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${styles.text} bg-current opacity-60`}></div>
            )}
        </button>
    );
};

// --- NAVBAR ---
// Nota: en Screener.jsx podrías añadir un state `activeSector` y pasarlo por prop para usar estos botones como filtros
const AppNavbar = ({ activeSector = 'all', onSelectSector = () => {} }) => {
    
    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-50 h-14 bg-[#0a0a0a]/90 border-b border-white/5 backdrop-blur-md">
                <div className="absolute inset-0 bg-black/80 pointer-events-none"></div>

                <div className="w-full h-full px-4 md:px-10 flex items-center justify-between relative z-10">
                    
                    {/* 1. IZQUIERDA: LOGO */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Link to="/" className="flex items-center gap-3 group outline-none">
                            <div className="relative w-7 h-7 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 shrink-0">
                                {/* Mantenemos tu logo general de LemonPyth */}
                                <img 
                                    src="/img/logo.svg" 
                                    alt="LemonPyth" 
                                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                    onError={(e) => { e.target.style.display = 'none'; }} 
                                />
                            </div>
                            <span className="text-sm font-montserrat font-black tracking-tighter uppercase italic leading-none text-white/90 hidden sm:block">
                                LemonPyth
                            </span>
                        </Link>
                    </div>

                    {/* 2. CENTRO: SELECTORES DE RED/SECTOR (Pyth Theme) */}
                    
                    {/* VERSIÓN MÓVIL */}
                    <div className="flex lg:hidden items-center gap-1 mx-2 overflow-x-auto no-scrollbar">
                        <FilterButton id="crypto" label="CRYPTO" icon={Activity} activeSector={activeSector} onSelect={onSelectSector} compact={true} />
                        <div className="w-px h-3 bg-white/10 mx-0.5 shrink-0"></div>
                        <FilterButton id="rwa" label="RWA" icon={Globe} activeSector={activeSector} onSelect={onSelectSector} compact={true} />
                        <div className="w-px h-3 bg-white/10 mx-0.5 shrink-0"></div>
                        <FilterButton id="all" label="MULTI-CHAIN" icon={Database} activeSector={activeSector} onSelect={onSelectSector} compact={true} />
                    </div>

                    {/* VERSIÓN DESKTOP */}
                    <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-full items-center">
                        <div className="flex items-center gap-2">
                            <FilterButton id="crypto" label="CRYPTO" icon={Activity} activeSector={activeSector} onSelect={onSelectSector} />
                            <div className="w-px h-3 bg-white/10 rounded-full mx-1"></div>
                            <FilterButton id="rwa" label="RWA" icon={Globe} activeSector={activeSector} onSelect={onSelectSector} />
                            <div className="w-px h-3 bg-white/10 rounded-full mx-1"></div>
                            <FilterButton id="all" label="MULTI-CHAIN" icon={Database} activeSector={activeSector} onSelect={onSelectSector} />
                        </div>
                    </div>

                    {/* 3. DERECHA: TERMINAL + HOME */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        {/* Icono Home */}
                        <Link to="/" className="text-gray-500 hover:text-white transition-all duration-300" title="Inicio">
                            <Home size={18} />
                        </Link>

                        {/* Botón Terminal */}
                        <Link to="/" className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:px-6 lg:py-1.5 bg-yellow-500 text-black font-extrabold text-[10px] tracking-[0.2em] uppercase rounded-sm hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all group overflow-hidden relative">
                            <Terminal size={14} strokeWidth={3} className="text-black lg:mr-2" />
                            <span className="hidden lg:inline relative z-10">TERMINAL</span>
                            <div className="hidden lg:block absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:left-full transition-all duration-700 ease-in-out"></div>
                        </Link>
                    </div>
                </div>
            </nav>
            <div className="h-14 bg-[#0a0a0a]"></div>
        </>
    );
};

export default AppNavbar;