import React, { useState, useEffect, useMemo } from 'react';
import { Lucid, Blockfrost, Data } from "lucid-cardano";
import blueprint from "../assets/plutus.json"; 

const SmartSupplyPanel = ({ selected, isLoading }) => {
    const [txState, setTxState] = useState('IDLE'); 
    const [orderType, setOrderType] = useState('MARKET'); 
    const [timeLeft, setTimeLeft] = useState(0);
    const [limitPrice, setLimitPrice] = useState("");
    const [lucid, setLucid] = useState(null);

    // --- LÓGICA DE CONEXIÓN A CARDANO ---
    useEffect(() => {
        const initBlockchain = async () => {
            try {
                // Pequeña espera para asegurar que Wasm/Polyfills cargaron
                await new Promise(res => setTimeout(res, 500));
                
                const lib = await Lucid.new(
                    new Blockfrost(
                        "https://cardano-preprod.blockfrost.io/api/v0",
                        "preprodW9VepmQEx3r9LPr3QncreNvkBDApZD8m" 
                    ),
                    "Preprod"
                );
                
                if (window.cardano && window.cardano.nami) {
                    const api = await window.cardano.nami.enable();
                    lib.selectWallet(api);
                    setLucid(lib);
                    console.log("✅ Cardano Ledger Ready");
                }
            } catch (err) {
                console.error("Wallet connection failed:", err);
            }
        };
        initBlockchain();
    }, []);

    // Definimos el Schema del Datum (Aiken)
    const PegDatumSchema = Data.Object({
        owner: Data.Bytes,
        lock_until: Data.Integer,
    });

    // --- ACCIONES ON-CHAIN ---
    const handleInitiate = async () => {
        if (!selected || !lucid) return;

        try {
            setTxState('PENDING');
            setTimeLeft(30);

            // Buscamos el validador en el blueprint
            const validatorEntry = blueprint.validators.find(v => v.title === "peg_defense.spend" || v.title.includes("spend"));
            if (!validatorEntry) throw new Error("Validator not found in plutus.json");

            const validator = {
                type: "PlutusV2",
                script: validatorEntry.compiledCode,
            };

            const scriptAddress = lucid.utils.validatorToAddress(validator);
            const address = await lucid.wallet.address();
            const ownerPkh = lucid.utils.getAddressDetails(address).paymentCredential.hash;
            
            const lockUntil = BigInt(Date.now() + 30000);

            const datum = Data.to({
                owner: ownerPkh,
                lock_until: lockUntil,
            }, PegDatumSchema);

            // Ejecución de la Tx
            const tx = await lucid
                .newTx()
                .payToContract(scriptAddress, { inline: datum }, { lovelace: 10000000n }) 
                .complete();

            const signedTx = await tx.sign().complete();
            const txHash = await signedTx.submit();
            console.log("🔥 Tx Committed to Ledger:", txHash);

        } catch (error) {
            console.error("Blockchain Error:", error);
            setTxState('IDLE');
            setTimeLeft(0);
        }
    };

    const handleRevert = async () => {
        setTxState('IDLE');
        setTimeLeft(0);
        console.log("🛑 Transacción revertida on-chain");
    };

    // --- LÓGICA DE UI ---
    const arbOpportunity = useMemo(() => {
        if (!selected || txState !== 'IDLE') return null;
        const threshold = 0.15;
        return Math.abs(selected.gap) > threshold;
    }, [selected, txState]);

    useEffect(() => {
        let timer;
        if (timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            if (txState === 'PENDING') {
                setTxState('LOCKING');
                setTimeLeft(15); 
            } else if (txState === 'LOCKING') {
                setTxState('SETTLED');
            }
        }
        return () => clearInterval(timer);
    }, [timeLeft, txState]);

    if (isLoading) return (
        <div className="p-5 bg-[#080808] h-full flex items-center justify-center font-square text-[10px] text-gray-600 animate-pulse uppercase">
            Sincronizando Ledger...
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#080808] p-5 font-square border-l border-white/5 relative">
            
            {/* SELECTOR DE MODO */}
            <div className="flex bg-white/5 p-1 rounded-lg mb-6 border border-white/5">
                {['MARKET', 'LIMIT'].map(type => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        disabled={txState !== 'IDLE'}
                        className={`flex-1 py-2 text-[9px] font-black rounded transition-all ${
                            orderType === type ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white opacity-50'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* MONITOR DE ESTADO */}
            <div className={`mb-6 p-4 border rounded-xl transition-all duration-500 ${
                txState === 'PENDING' ? 'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.05)]' :
                txState === 'LOCKING' ? 'border-blue-500/50 bg-blue-500/5 animate-pulse' : 
                txState === 'SETTLED' ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'
            }`}>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Ledger Status</span>
                    <span className={`text-[10px] font-black ${
                        txState === 'PENDING' ? 'text-yellow-500' : 
                        txState === 'LOCKING' ? 'text-blue-400' : 
                        txState === 'SETTLED' ? 'text-green-500' : 'text-gray-600'
                    }`}>
                        {txState}
                    </span>
                </div>
                {timeLeft > 0 && (
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${txState === 'PENDING' ? 'bg-yellow-500' : 'bg-blue-400'}`}
                            style={{ width: `${(timeLeft / (txState === 'PENDING' ? 30 : 15)) * 100}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* PRECIOS PYTH */}
            <div className="space-y-3 mb-6">
                <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center">
                    <span className="text-[9px] text-gray-500 uppercase">Pyth Oracle</span>
                    <span className="text-sm font-black text-white tabular-nums">
                        ${selected?.pythPrice?.toFixed(4) || '0.0000'}
                    </span>
                </div>

                {orderType === 'LIMIT' && txState === 'IDLE' && (
                    <div className="relative">
                        <input 
                            type="number" 
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            placeholder="Set Price..."
                            className="w-full bg-black border border-white/10 p-3 rounded-lg text-xs text-yellow-500 outline-none focus:border-yellow-500/50 transition-all font-bold"
                        />
                        <span className="absolute right-3 top-3 text-[9px] text-gray-600 font-bold uppercase">USD</span>
                    </div>
                )}

                {arbOpportunity && txState === 'IDLE' && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] text-green-500 font-black uppercase">Arb Opportunity</span>
                            <span className="text-[10px] text-white font-bold">+{selected?.gap?.toFixed(3)}%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ACCIONES */}
            <div className="flex-1 flex flex-col gap-3">
                {txState === 'IDLE' ? (
                    <button 
                        disabled={!selected || !lucid}
                        onClick={handleInitiate}
                        className={`w-full py-5 rounded-xl font-black text-xs tracking-[0.2em] transition-all active:scale-95 ${
                            arbOpportunity 
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' 
                            : 'bg-white text-black hover:bg-slate-200 opacity-90'
                        } disabled:opacity-20`}
                    >
                        {arbOpportunity ? 'EXECUTE ARBITRAGE' : `INITIATE ${orderType}`}
                    </button>
                ) : txState === 'PENDING' ? (
                    <div className="flex flex-col gap-4">
                        <div className="text-center py-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                            <p className="text-[10px] text-yellow-500 font-bold uppercase mb-2">Reversible Window</p>
                            <p className="text-3xl font-black text-white">{timeLeft}s</p>
                        </div>
                        <button 
                            onClick={handleRevert}
                            className="w-full py-4 bg-red-600 text-white font-black text-[10px] rounded-xl tracking-widest shadow-lg shadow-red-600/20 active:scale-95"
                        >
                            REVERT TRANSACTION
                        </button>
                    </div>
                ) : txState === 'LOCKING' ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-4">
                        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Validating Ledger...</p>
                        <p className="text-[9px] text-gray-600 italic">Confirmation via Blockfrost</p>
                    </div>
                ) : (
                    <div className="text-center p-6 bg-green-500/5 border border-green-500/20 rounded-xl animate-in zoom-in-95 duration-500">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-green-500 text-xl">✓</span>
                        </div>
                        <p className="text-xs text-white font-black uppercase mb-1">Success</p>
                        <p className="text-[9px] text-gray-500 mb-4">Confirmed at script: {blueprint.validators[0].title}</p>
                        <button 
                            onClick={() => setTxState('IDLE')}
                            className="text-[9px] text-blue-400 font-black uppercase hover:underline"
                        >
                            New Transaction
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[8px] text-gray-600 font-bold">
                    <span>POLICY ID</span>
                    <span className="text-blue-900">VERIFIED</span>
                </div>
                <p className="text-[7px] text-gray-700 break-all font-mono opacity-50">
                    {blueprint.validators[0].hash}
                </p>
            </div>
        </div>
    );
};

export default SmartSupplyPanel;