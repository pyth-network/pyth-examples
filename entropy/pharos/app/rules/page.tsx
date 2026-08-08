"use client";
import React from 'react';
import Link from 'next/link';
import { FaWallet, FaTicketAlt, FaClock, FaGift, FaTags, FaLock, FaBalanceScale, FaShieldAlt, FaLifeRing, FaLightbulb, FaArrowLeft } from 'react-icons/fa';

const RulesPage = () => {
  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <span className="text-pharos-orange text-xl mt-1">●</span>
      <p>{children}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pharos-yellow/20 to-pharos-orange/10 py-12 px-4 md:px-8 lg:px-12 font-rubik">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-3 bg-pharos-orange text-black border-4 border-black px-6 py-3 font-rubik font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-100 hover:bg-pharos-yellow"
          >
            <FaArrowLeft className="text-2xl" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-rubik font-black uppercase text-black mb-4 drop-shadow-[4px_4px_0px_rgba(243,162,15,0.3)]">
            🎯 Pharos Raffle Rules & Regulations
          </h1>
          <p className="text-lg md:text-xl font-rubik font-semibold text-gray-700">
            All participants must read and agree to these rules before participating
          </p>
        </div>

        {/* Rules Sections */}
        <div className="space-y-6">
          {/* Rule 1 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                🪙 1. Entry & Participation
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Each participant must connect a valid crypto wallet to join a raffle.</BulletPoint>
              <BulletPoint>Multiple entries from different wallets are allowed, but participants are encouraged to play fairly.</BulletPoint>
              <BulletPoint>Once purchased, raffle tickets are non-refundable and non-transferable.</BulletPoint>
              <BulletPoint>Each raffle may have minimum and maximum ticket purchase limits, defined by the admin.</BulletPoint>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                💰 2. Ticket Sales & Prize Pool
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Every raffle has a target ticket limit (e.g., 1,000 tickets).</BulletPoint>
              <BulletPoint>If the total number of tickets sold is less than the limit by the end time, the available prize pool will still be distributed among winners after deducting platform fees.</BulletPoint>
              <BulletPoint>All transactions are made using PYUSD or other supported stablecoins.</BulletPoint>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                🧾 3. Raffle Closing & Winner Selection
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Once the raffle timer ends, the raffle will be officially closed by the Pharos Admin.</BulletPoint>
              <BulletPoint>Winners will be selected through an on-chain verifiable random process (e.g., Pyth Entropy).</BulletPoint>
              <BulletPoint>The results will be verified and announced by the Admin to ensure complete transparency.</BulletPoint>
              <BulletPoint>Participants are requested to wait for the admin announcement of winners and distribution details.</BulletPoint>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                🎁 4. Prize Distribution
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Prize distribution will be handled by the Pharos Admin after the raffle officially ends.</BulletPoint>
              <BulletPoint>Winners must wait for the admin confirmation and distribution process to be completed.</BulletPoint>
              <BulletPoint>Crypto prizes will be transferred directly to the winner's connected wallet.</BulletPoint>
              <BulletPoint>Physical prizes (e.g., shoes, concert tickets, or merchandise) require the winner to contact the admin for verification and delivery coordination.</BulletPoint>
              <BulletPoint>Physical prizes are available only in eligible countries (listed per raffle).</BulletPoint>
              <BulletPoint>If the winner's country is not eligible, the equivalent prize value in PYUSD will be credited instead.</BulletPoint>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                ⏰ 5. Timeline & Claiming
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Each raffle has a clearly visible start and end time within the app.</BulletPoint>
              <BulletPoint>Winners must claim or confirm their prize within 15 days of announcement.</BulletPoint>
              <BulletPoint>Unclaimed rewards will be reallocated or added to the next prize pool.</BulletPoint>
            </div>
          </div>

          {/* Rule 6 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                ⚙️ 6. Platform Fees & Transparency
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>A small platform fee (2–5%) will be deducted from each raffle pool for operational costs.</BulletPoint>
              <BulletPoint>All fees, wallet addresses, and transaction data are publicly verifiable on-chain.</BulletPoint>
            </div>
          </div>

          {/* Rule 7 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                ⚖️ 7. Compliance & Responsibility
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Participants must ensure compliance with their local crypto and raffle laws.</BulletPoint>
              <BulletPoint>Pharos is not responsible for legal restrictions in certain regions.</BulletPoint>
              <BulletPoint>Any fraudulent, automated, or suspicious activity may result in disqualification and wallet blocking.</BulletPoint>
            </div>
          </div>

          {/* Rule 8 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                🔒 8. Security & Privacy
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Pharos does not collect personal data.</BulletPoint>
              <BulletPoint>Users are responsible for the security of their wallet and private keys.</BulletPoint>
              <BulletPoint>The platform will never request private keys or sensitive information.</BulletPoint>
            </div>
          </div>

          {/* Rule 9 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                📞 9. Support & Dispute Resolution
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>For ticket or prize-related issues, contact the Pharos Admin team via the official channels.</BulletPoint>
              <BulletPoint>In case of disputes, the Admin's decision will be final until DAO-based governance is implemented.</BulletPoint>
            </div>
          </div>

          {/* Rule 10 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black">
                💡 10. Updates to Rules
              </h2>
            </div>
            <div className="space-y-3 text-base md:text-lg text-gray-700 font-rubik">
              <BulletPoint>Pharos reserves the right to update or modify rules based on platform evolution.</BulletPoint>
              <BulletPoint>All updates will be announced transparently and reflected in the app or official channels.</BulletPoint>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-12 bg-gradient-to-br from-pharos-orange/20 to-pharos-yellow/20 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 text-center">
          <p className="text-lg font-rubik font-bold text-black uppercase mb-4">
            ⚠️ Important Notice
          </p>
          <p className="text-base font-rubik text-gray-700">
            By participating in any Pharos raffle, you acknowledge that you have read, understood, and agree to abide by these rules and regulations. Failure to comply may result in disqualification or account suspension.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
