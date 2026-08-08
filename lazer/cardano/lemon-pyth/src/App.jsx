import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LoadingScreen from './components/LoadingScreen';

// 1. CARGA SOLO EL SCREENER (Única herramienta activa)
const ScreenerTool = lazy(() => import('./pages/screener/Screener')); 

function App() {
  const [activeModule, setActiveModule] = useState('loading');

  useEffect(() => {
    // Simulamos un pequeño delay para el LoadingScreen y verificar el entorno
    const timer = setTimeout(() => {
      setActiveModule('screener');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (activeModule === 'loading') return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <BrowserRouter>
        <Routes>
          {/* 2. LA RAÍZ ES SIEMPRE EL SCREENER */}
          <Route path="/" element={<ScreenerTool />} />
          
          {/* 3. RUTA EXPLÍCITA PARA EL SCREENER */}
          <Route path="/screener" element={<ScreenerTool />} />

          {/* 4. CUALQUIER OTRA RUTA (como /terminal) REDIRIGE AL INICIO */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
}

export default App;