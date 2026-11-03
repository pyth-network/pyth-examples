import React, { useEffect, useState } from 'react';

const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);

    // Animación visual de progreso (simulada)
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 99) return 99; 
                return prev + Math.random() * 20; 
            });
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#020203] flex flex-col items-center justify-center overflow-hidden font-mono transition-opacity duration-500 ease-in-out">
            {/* Ruido súper sutil */}
            <div className="absolute inset-0 bg-[url('/img/noise.png')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>

            {/* CONTENIDO CENTRAL */}
            <div className="relative z-10 flex flex-col items-center animate-pulse">
                
                {/* EL LOGO (Favicon) */}
                <div className="mb-10 relative">
                    {/* Pequeño resplandor detrás del logo para darle profundidad */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-yellow-500/10 blur-[30px] rounded-full pointer-events-none"></div>
                    
                    {/* Usamos un texto o logo simple de LemonPyth para el loading */}
                    <h1 className="text-3xl font-bold text-white tracking-widest relative z-10 flex items-center gap-2">
                        LEMON<span className="text-yellow-500">PYTH</span>
                    </h1>
                </div>

                {/* ÁREA DE CARGA MINIMALISTA */}
                <div className="flex flex-col items-center w-56 md:w-64">
                    
                    {/* Barra de Progreso Minimalista */}
                    <div className="relative w-full h-[2px] bg-white/10 mb-6 overflow-hidden rounded-full">
                        <div 
                            className="absolute top-0 left-0 h-full bg-yellow-500 transition-all duration-200 ease-linear shadow-[0_0_10px_#eab308]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    {/* Texto limpio */}
                    <p className="text-[#606060] text-[10px] md:text-xs uppercase tracking-[0.4em]">
                        Connecting to Pyth Oracle...
                    </p>
                </div>

            </div>
        </div>
    );
};

export default LoadingScreen;