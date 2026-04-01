/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { StandingsPage } from './pages/StandingsPage';
import { NewsPage } from './pages/NewsPage';
import { TipsPage } from './pages/TipsPage';
import { SplashScreen } from './components/SplashScreen';

// Admin
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { TipsManagePage } from './pages/admin/TipsManagePage';
import { JackpotsManagePage } from './pages/admin/JackpotsManagePage';
import { RevenuePage } from './pages/admin/RevenuePage';
import { PricingManagePage } from './pages/admin/PricingManagePage';
import { BroadcastPage } from './pages/admin/BroadcastPage';
import { AdsManagePage } from './pages/admin/AdsManagePage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      <BrowserRouter>
        <Routes>
          {/* Public site */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/fixtures" element={<FixturesPage />} />
            <Route path="/match/:id" element={<MatchDetailPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/tips" element={<TipsPage />} />
          </Route>

          {/* Admin console */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="tips" element={<TipsManagePage />} />
            <Route path="jackpots" element={<JackpotsManagePage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="pricing" element={<PricingManagePage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
            <Route path="ads" element={<AdsManagePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
