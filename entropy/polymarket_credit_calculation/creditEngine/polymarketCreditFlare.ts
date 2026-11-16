// polymarketCreditFlare.ts

export interface FlareClosedPosition {
    realizedPnl: string;
    totalBought: string;
    asset: string;
}

export interface FlareCurrentPosition {
    size: string;
    avgPrice: string;
    initialValue: string;
    currentValue: string;
    cashPnl: string;
    percentPnl: string;
    totalBought: string;
    realizedPnl: string;
    percentRealizedPnl: string;
    curPrice: string;
}

export interface FlareUser {
    name: string;
    value: string;
}

export interface FlareScoreInput {
    user: FlareUser;
    closedPositions: FlareClosedPosition[];
    currentPositions: FlareCurrentPosition[];
}

export interface CreditResult {
    userName: string;
    userId: string;
    pd: number; // probability of bad event
    creditScore: number; // 300–850 style
    ltv: number; // 0–1
    maxLoan: number; // in “USDC” units (same units as pnl/values)
    features: {
        ROI_real: number;
        WinRate: number;
        Sharpe: number;
        ProfitFactorFeature: number;
        DD_open: number;
        HHI_open: number;
        DeadShare: number;
        V_open: number;
        V_realized_plus: number;
        V_eff: number;
    };
    subscores: {
        performance: number;
        risk: number;
    };
}

// ---- Core function ----

export function computeCreditFromFlare(score: FlareScoreInput): CreditResult {
    const eps = 1e-8;

    // ---------- 1. Parse and normalize closed positions ----------

    const closed = (score.closedPositions || []).map((cp) => {
        const realizedPnl = Number(cp.realizedPnl) || 0;
        const totalBought = Number(cp.totalBought) || 0;
        return { realizedPnl, totalBought };
    });

    const N_closed = closed.length;

    let totalRealizedPnl = 0;
    let totalBoughtAll = 0;
    const rj: number[] = [];

    for (const cp of closed) {
        totalRealizedPnl += cp.realizedPnl;
        totalBoughtAll += cp.totalBought;
        const cost = Math.max(1, cp.totalBought);
        const r = cp.realizedPnl / cost;
        rj.push(r);
    }

    const ROI_real = totalBoughtAll <= 0 ? 0 : totalRealizedPnl / Math.max(1, totalBoughtAll);

    const WinRate = N_closed === 0 ? 0.5 : closed.filter((cp) => cp.realizedPnl > 0).length / Math.max(1, N_closed);

    let rMean = 0;
    let rVar = 0;
    if (N_closed > 0) {
        rMean = rj.reduce((a, b) => a + b, 0) / N_closed;
        if (N_closed > 1) {
            rVar = rj.reduce((sum, r) => sum + (r - rMean) * (r - rMean), 0) / N_closed;
        }
    }
    const rStd = Math.sqrt(rVar + eps);
    const Sharpe = rMean / (rStd + eps);

    // Profit factor: sum positive PnL / sum negative |PnL|, then clamp & transform
    let Gplus = 0;
    let Gminus = 0;
    for (const cp of closed) {
        if (cp.realizedPnl > 0) Gplus += cp.realizedPnl;
        else if (cp.realizedPnl < 0) Gminus += -cp.realizedPnl;
    }
    const PF_raw = Gplus / (Gminus + eps);
    const PF_clamped = Math.min(PF_raw, 10); // cap insane PF
    const ProfitFactorFeature = PF_clamped - 1; // center around ~0

    // ---------- 2. Parse and normalize current positions ----------

    const current = (score.currentPositions || []).map((cp) => {
        const initialValue = Number(cp.initialValue) || 0;
        const currentValue = Number(cp.currentValue) || 0;
        const percentPnl = Number(cp.percentPnl) || 0;
        return { initialValue, currentValue, percentPnl };
    });

    let I_open = 0;
    let C_open = 0;
    for (const pos of current) {
        I_open += pos.initialValue;
        C_open += pos.currentValue;
    }

    const DD_open = I_open <= 0 ? 0 : (C_open - I_open) / Math.max(1, I_open);

    const V_curr = current.reduce((sum, pos) => sum + pos.currentValue, 0);
    let HHI_open = 0;
    if (V_curr > 0) {
        HHI_open = current.reduce((sum, pos) => {
            const share = pos.currentValue / V_curr;
            return sum + share * share;
        }, 0);
    }

    // DeadShare = fraction of initial exposure at -100% PnL
    let deadInitSum = 0;
    for (const pos of current) {
        if (pos.percentPnl <= -100) {
            deadInitSum += pos.initialValue;
        }
    }
    const DeadShare = I_open <= 0 ? 0 : deadInitSum / Math.max(1, I_open);

    const V_open = C_open;
    const V_realized_plus = closed.reduce((sum, cp) => sum + Math.max(0, cp.realizedPnl), 0);

    // Weight for realized PnL contributing to effective collateral
    const lambdaRealized = 0.25;
    const V_eff = V_open + lambdaRealized * V_realized_plus;

    // ---------- 3. Subscores (no standardization, but centered transforms) ----------

    // Performance score:
    // Perf = 1.0*ROI_real + 0.8*(WinRate-0.5) + 0.4*Sharpe + 0.15*ProfitFactorFeature
    const PerfScore = 1.0 * ROI_real + 0.8 * (WinRate - 0.5) + 0.4 * Sharpe + 0.15 * ProfitFactorFeature;

    // Risk score:
    // Risk = 1.5*(-DD_open) + 1.0*HHI_open + 1.0*DeadShare
    const RiskScore = 1.5 * -DD_open + 1.0 * HHI_open + 1.0 * DeadShare;

    // ---------- 4. Logistic PD model ----------

    // Calibrated coefficients (heuristic but numerically tuned):
    const beta0 = -0.9;
    const betaPerf = -1.0; // higher performance -> lower PD
    const betaRisk = 0.7; // higher risk -> higher PD

    const z = beta0 + betaPerf * PerfScore + betaRisk * RiskScore;
    const PD = 1 / (1 + Math.exp(-z));

    // ---------- 5. Score mapping (FICO-style with PDO = 50, ScoreRef = 650 at PD=0.2) ----------

    const PDO = 50;
    const Factor = PDO / Math.log(2); // ~72.13475
    const ScoreRef = 650;
    const OddsRef = 4; // 4:1 odds (PD=0.2)
    const Offset = ScoreRef - Factor * Math.log(OddsRef); // ~550

    const oddsGood = (1 - PD) / Math.max(PD, eps);
    const rawScore = Offset + Factor * Math.log(Math.max(oddsGood, eps));

    const ScoreMin = 300;
    const ScoreMax = 850;
    const creditScore = Math.min(ScoreMax, Math.max(ScoreMin, rawScore));

    // ---------- 6. LTV & Max Loan ----------

    const G = Math.max(0, 1 - PD); // goodness

    const LTV_min = 0.25;
    const LTV_max = 0.8;
    const gamma = 1.5;

    const ltv = LTV_min + (LTV_max - LTV_min) * Math.pow(G, gamma);

    const kappa = 1.5;
    const delta = 1.2;

    const collateralLoan = ltv * V_eff;
    const cappedLoan = kappa * V_eff * Math.pow(G, delta);
    const maxLoan = Math.max(0, Math.min(collateralLoan, cappedLoan));

    return {
        userName: score.user?.name ?? "",
        userId: score.user?.value ?? "",
        pd: PD,
        creditScore,
        ltv,
        maxLoan,
        features: {
            ROI_real,
            WinRate,
            Sharpe,
            ProfitFactorFeature,
            DD_open,
            HHI_open,
            DeadShare,
            V_open,
            V_realized_plus,
            V_eff,
        },
        subscores: {
            performance: PerfScore,
            risk: RiskScore,
        },
    };
}
