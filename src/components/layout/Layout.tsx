import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { AuthModal } from '../AuthModal';
import { Toaster } from 'sonner';
// Detached: import { BetSlipDrawer } from '../BetSlipDrawer';
import { ReloadPrompt } from '../ReloadPrompt';
import { PricingModal } from '../PricingModal';
import { JackpotPurchaseModal } from '../JackpotPurchaseModal';
import { useUser } from '../../context/UserContext';
import { usePageTracking } from '../../hooks/usePageTracking';

export function Layout() {
  const { showPricingModal, setShowPricingModal, showJackpotModal, setShowJackpotModal, selectedJackpot, user } = useUser();

  // Initialize tracking only for logged-in users 
  // Wait, usePageTracking handles token internally, but we can just mount it regardless or selectively.
  // Actually, I'll mount it unconditionally. The hook handles auth.
  usePageTracking();

  return (
    <div className="min-h-screen bg-pitch text-zinc-50 font-sans flex flex-col">
      <Toaster theme="dark" position="top-center" />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <AuthModal />
      {/* Detached: <BetSlipDrawer /> */}
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
      <JackpotPurchaseModal 
        isOpen={showJackpotModal} 
        onClose={() => setShowJackpotModal(false)} 
        jackpot={selectedJackpot} 
      />
      <ReloadPrompt />
    </div>
  );
}
