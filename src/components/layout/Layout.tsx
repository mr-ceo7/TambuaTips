import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { AuthModal } from '../AuthModal';
import { Toaster } from 'sonner';
import { BetSlipDrawer } from '../BetSlipDrawer';
import { ReloadPrompt } from '../ReloadPrompt';
import { PricingModal } from '../PricingModal';
import { useUser } from '../../context/UserContext';

export function Layout() {
  const { showPricingModal, setShowPricingModal } = useUser();

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
      <BetSlipDrawer />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
      <ReloadPrompt />
    </div>
  );
}
