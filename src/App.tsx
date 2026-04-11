/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Layout } from './components/layout/Layout';
import { DeviceConflictModal } from './components/DeviceConflictModal';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { StandingsPage } from './pages/StandingsPage';
import { NewsPage } from './pages/NewsPage';
import { TipsPage } from './pages/TipsPage';
import { MagicLoginPage } from './pages/MagicLoginPage';
import { SplashScreen } from './components/SplashScreen';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import { ResponsibleGambling } from './pages/legal/ResponsibleGambling';
import { RefundPolicy } from './pages/legal/RefundPolicy';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AboutUsPage } from './pages/AboutUsPage';

// Affiliate
import { AffiliateApp } from './pages/affiliate/AffiliateApp';
import { affiliateTrackingService } from './services/affiliateService';

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
import { SettingsManagePage } from './pages/admin/SettingsManagePage';
import { CampaignsManagePage } from './pages/admin/CampaignsManagePage';
import { CampaignProvider, useCampaign } from './context/CampaignContext';

// Lazy-load affiliate admin page
const AffiliatesManagePage = React.lazy(() => import('./pages/admin/AffiliatesManagePage'));

function CampaignMetaManager() {
  const { activeCampaign } = useCampaign();
  
  React.useEffect(() => {
    if (activeCampaign && activeCampaign.asset_image_url) {
      let metaOgImg = document.querySelector('meta[property="og:image"]');
      if (!metaOgImg) {
        metaOgImg = document.createElement('meta');
        metaOgImg.setAttribute('property', 'og:image');
        document.head.appendChild(metaOgImg);
      }
      metaOgImg.setAttribute('content', activeCampaign.asset_image_url);

      let metaTwitterImg = document.querySelector('meta[name="twitter:image"]');
      if (!metaTwitterImg) {
        metaTwitterImg = document.createElement('meta');
        metaTwitterImg.setAttribute('name', 'twitter:image');
        document.head.appendChild(metaTwitterImg);
      }
      metaTwitterImg.setAttribute('content', activeCampaign.asset_image_url);
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && activeCampaign.description) {
         metaDesc.setAttribute('content', activeCampaign.description);
      }
    }
  }, [activeCampaign]);
  return null;
}

function ReferralCatcher() {
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('tambua_referral_code', ref);
    }
  }, []);
  return null;
}

function AffiliateCatcher() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aff = params.get('aff') || params.get('ref');
    if (aff) {
      // Validate and cache the affiliate code
      affiliateTrackingService.validateCode(aff).then(res => {
        if (res.data.valid) {
          localStorage.setItem('tambua_affiliate_code', aff);
          localStorage.setItem('tambua_affiliate_expires', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
          // Track the click
          affiliateTrackingService.trackClick(aff, document.referrer || undefined).catch(() => {});
        }
      }).catch(() => {});

      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('aff');
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    } else {
      // Check if cached code has expired
      const expires = localStorage.getItem('tambua_affiliate_expires');
      if (expires && Date.now() > Number(expires)) {
        localStorage.removeItem('tambua_affiliate_code');
        localStorage.removeItem('tambua_affiliate_expires');
      }
    }
  }, []);
  return null;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Subdomain detection: if on affiliate.*, render the affiliate portal
  const hostname = window.location.hostname;
  const isAffiliatePortal = hostname.startsWith('affiliate.') || hostname === 'affiliate.localhost' || localStorage.getItem('dev_affiliate_mode') === 'true';

  if (isAffiliatePortal) {
    return (
      <BrowserRouter>
        <AffiliateApp />
      </BrowserRouter>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      <DeviceConflictModal />
      <CampaignProvider>
        <BrowserRouter>
          <CampaignMetaManager />
          <ReferralCatcher />
          <AffiliateCatcher />
          <Routes>
            {/* Public site */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/fixtures" element={<FixturesPage />} />
              <Route path="/match/:id" element={<MatchDetailPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/tips" element={<TipsPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/responsible-gambling" element={<ResponsibleGambling />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/welcome" element={<MagicLoginPage />} />
              <Route path="*" element={<NotFoundPage />} />
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
              <Route path="campaigns" element={<CampaignsManagePage />} />
              <Route path="settings" element={<SettingsManagePage />} />
              <Route path="affiliates" element={
                <React.Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><div style={{color:'#10b981'}}>Loading...</div></div>}>
                  <AffiliatesManagePage />
                </React.Suspense>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </CampaignProvider>
    </>
  );
}
