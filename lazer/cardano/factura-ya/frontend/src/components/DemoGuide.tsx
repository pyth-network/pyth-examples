import { useState } from "react";
import type { ConnectedWallet } from "../lib/wallet.ts";

interface Props {
  wallet: ConnectedWallet | null;
  activeTab: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  action: string;
  completed: (wallet: ConnectedWallet | null, tab: string) => boolean;
}

const steps: Step[] = [
  {
    id: 1,
    title: "Connect your wallet",
    description:
      "Click the wallet button in the top-right corner. Select Nami, Eternl, or Lace. Make sure you're on the PreProd testnet.",
    action: "Connect wallet above",
    completed: (w) => w !== null,
  },
  {
    id: 2,
    title: "Browse the marketplace",
    description:
      'Check out the listed invoices. Each card shows the original amount (ARS), the discounted price (ADA), the discount percentage, and days until the due date. These are real invoices tokenized as NFTs on Cardano.',
    action: 'Click "Marketplace" tab',
    completed: (_w, tab) => tab === "marketplace",
  },
  {
    id: 3,
    title: "Check the live price",
    description:
      "The ADA/USD price displayed at the top comes from Pyth's oracle. In production, this is a real-time feed consumed both on-chain (for valuation) and off-chain (for display).",
    action: "See the price indicator above",
    completed: () => true,
  },
  {
    id: 4,
    title: "Register an invoice (SME flow)",
    description:
      'Switch to the "Register Invoice" tab. Fill in the form as if you were an SME with an unpaid invoice. The system will tokenize it as an NFT, lock 10% collateral in escrow, and list it on the marketplace.',
    action: 'Click "Register Invoice" tab',
    completed: (_w, tab) => tab === "register",
  },
  {
    id: 5,
    title: "Submit the invoice",
    description:
      'Fill in the amount (e.g., 500000 ARS), days to due date (e.g., 90), debtor name (e.g., "TechCorp"), and debtor contact. Click "Tokenize & List". This triggers: NFT mint + collateral lock + marketplace listing in one transaction.',
    action: "Fill the form and submit",
    completed: () => false,
  },
  {
    id: 6,
    title: "Purchase an invoice (Investor flow)",
    description:
      'Go back to the Marketplace. Click "Purchase" on any invoice. The investor pays the discounted price in ADA, the SME receives funds instantly, and the NFT transfers to the buyer. The escrow is updated with the buyer\'s identity.',
    action: 'Click "Purchase" on a listed invoice',
    completed: () => false,
  },
  {
    id: 7,
    title: "Settlement",
    description:
      "After the due date, the buyer confirms payment received (collateral returns to SME) or reports non-payment (collateral goes to buyer as compensation). This is enforced by the on-chain escrow validator — no intermediaries needed.",
    action: "This happens automatically at maturity",
    completed: () => false,
  },
];

export function DemoGuide({ wallet, activeTab }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  if (!expanded) {
    return (
      <button className="guide-toggle" onClick={() => setExpanded(true)}>
        Show Demo Guide
      </button>
    );
  }

  const step = steps[currentStep];
  const isCompleted = step.completed(wallet, activeTab);

  return (
    <div className="demo-guide">
      <div className="guide-header">
        <h3>Demo Guide</h3>
        <button className="guide-close" onClick={() => setExpanded(false)}>
          Hide
        </button>
      </div>

      <div className="guide-progress">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`guide-dot ${i === currentStep ? "current" : ""} ${i < currentStep ? "done" : ""}`}
            onClick={() => setCurrentStep(i)}
          />
        ))}
      </div>

      <div className="guide-step">
        <div className="step-number">
          Step {step.id} of {steps.length}
        </div>
        <h4>{step.title}</h4>
        <p>{step.description}</p>
        <div className="step-action">{step.action}</div>
      </div>

      <div className="guide-nav">
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => s - 1)}
        >
          Previous
        </button>
        <button
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep((s) => s + 1)}
        >
          {isCompleted ? "Next" : "Skip"}
        </button>
      </div>
    </div>
  );
}
