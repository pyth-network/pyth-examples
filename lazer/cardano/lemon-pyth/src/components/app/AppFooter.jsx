import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Server, ChevronUp } from 'lucide-react';

// --- COMPONENTE ICONO SOCIAL ---
const SocialIcon = ({ href, path, title }) => (
    <a 
        href={href} 
        target="_blank" 
        rel="noreferrer" 
        title={title}
        className="text-[#444] hover:text-white transition-colors duration-300 p-1 md:p-0"
    >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d={path} />
        </svg>
    </a>
);

const AppFooter = ({ activeSector, count, isLoading }) => {
    const [showLegalMenu, setShowLegalMenu] = useState(false);
    
    // Adaptado a la temática del Hackathon
    const getNetworkLabel = (sector) => {
        if (sector === 'rwa') return 'CARDANO PLUTUS V2';
        if (sector === 'crypto') return 'MULTI-CHAIN ORACLE';
        return 'PYTH MAINNET';
    };

    return (
        <footer className="h-10 md:h-8 w-full bg-[#050505] border-t border-[#1a1a1a] flex items-center justify-between px-3 md:px-4 select-none z-50 fixed bottom-0 left-0 text-[10px] font-mono">
            
            {/* --- IZQUIERDA: SOCIALES GENÉRICOS / PYTH --- */}
            <div className="flex items-center gap-4 w-1/3 md:w-auto">
                <div className="flex items-center gap-2 md:gap-3">
                    {/* GitHub Icon */}
                    <SocialIcon title="GitHub" href="https://github.com/pyth-network" path="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    {/* X (Twitter) Icon */}
                    <SocialIcon title="X (Twitter)" href="https://x.com/PythNetwork" path="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    {/* Discord Icon */}
                    <SocialIcon title="Discord" href="https://discord.gg/pythnetwork" path="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                </div>

                <div className="hidden md:block w-px h-3 bg-[#222]"></div>

                {/* Datos de Red (Desktop) */}
                <div className="hidden md:flex items-center gap-4 tracking-wide w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-2 text-[#606060]">
                        <Server size={11} />
                        <span>NETWORK:</span>
                        <span className="text-yellow-500 font-bold uppercase tracking-wider">
                            {getNetworkLabel(activeSector)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-[#606060]">
                        <Activity size={11} />
                        <span>FEEDS:</span>
                        <span className="text-[#e0e0e0] font-bold">{count || 0}</span>
                    </div>
                </div>
            </div>

            {/* --- CENTRO: SOLO MÓVIL (Pyth Branding) --- */}
            <div className="md:hidden absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-auto">
                <a href="https://pyth.network/" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                    <span className="text-[7px] text-yellow-500 uppercase tracking-widest leading-none font-bold">Powered by</span>
                    <span className="text-[10px] text-white font-bold tracking-wide mt-0.5">PYTH NETWORK</span>
                </a>
            </div>

            {/* --- DERECHA: LEGAL + STATUS --- */}
            <div className="flex items-center gap-3 md:gap-5 w-1/3 md:w-auto justify-end">
                
                {/* Enlaces Legales genéricos */}
                <div className="flex items-center gap-4 font-bold tracking-widest text-[#444] relative">
                    <div className="md:hidden relative">
                        {showLegalMenu && (
                            <>
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowLegalMenu(false)}></div>
                                <div className="absolute bottom-full right-0 mb-3 w-32 bg-[#111] border border-[#222] rounded-lg shadow-xl p-1 z-50 flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200">
                                    <Link to="/" className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors text-right block">DOCS</Link>
                                    <Link to="/" className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors text-right block">GITHUB</Link>
                                    <div className="border-t border-[#222] mt-1 pt-1 text-center text-[8px] text-yellow-500">
                                        LemonPyth Team
                                    </div>
                                </div>
                            </>
                        )}
                        <button 
                            onClick={() => setShowLegalMenu(!showLegalMenu)}
                            className={`flex items-center gap-1 hover:text-white transition-colors uppercase ${showLegalMenu ? 'text-white' : 'text-[#444]'}`}
                        >
                            INFO <ChevronUp size={10} className={`transition-transform ${showLegalMenu ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Links Desktop */}
                    <div className="hidden md:flex gap-4">
                        <Link to="/" className="hover:text-white transition-colors">DOCS</Link>
                        <Link to="/" className="hover:text-white transition-colors">GITHUB</Link>
                    </div>
                </div>

                <div className="hidden md:block w-px h-3 bg-[#222]"></div>

                {/* Powered by Pyth (Desktop) */}
                <a href="https://pyth.network/" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[9px] uppercase tracking-widest text-[#606060]">Powered by</span>
                    <span className="font-bold text-yellow-500 tracking-wide text-[10px]">Pyth</span>
                </a>

                <div className="hidden md:block w-px h-3 bg-[#222]"></div>

                {/* Estado de Conexión Oracle */}
                <div className="hidden md:flex items-center gap-2">
                    <div className="relative flex h-1.5 w-1.5">
                        {!isLoading && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLoading ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                    </div>
                    <span className={`font-bold tracking-widest uppercase text-[9px] ${isLoading ? 'text-yellow-500' : 'text-emerald-500'}`}>
                        {isLoading ? 'SYNCING ORACLE' : 'ORACLE LIVE'}
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;