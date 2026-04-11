/**
 * AffiliateApp — root component for the affiliate subdomain.
 * Renders either the login page or the authenticated portal with sidebar layout.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AffiliateProvider, useAffiliate } from '../../context/AffiliateContext';
import { AffiliateLoginPage } from './AffiliateLoginPage';
import { AffiliateLayout } from './AffiliateLayout';
import { AffiliateDashboardPage } from './AffiliateDashboardPage';
import { AffiliateConversionsPage } from './AffiliateConversionsPage';
import { AffiliatePayoutsPage } from './AffiliatePayoutsPage';
import { AffiliateTeamPage } from './AffiliateTeamPage';
import { Loader2 } from 'lucide-react';

function AffiliateRoutes() {
  const { affiliate, loading } = useAffiliate();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b',
      }}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#10b981', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <Routes>
        <Route path="*" element={<AffiliateLoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AffiliateLayout />}>
        <Route path="/dashboard" element={<AffiliateDashboardPage />} />
        <Route path="/conversions" element={<AffiliateConversionsPage />} />
        <Route path="/payouts" element={<AffiliatePayoutsPage />} />
        <Route path="/team" element={<AffiliateTeamPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function AffiliateApp() {
  return (
    <AffiliateProvider>
      <AffiliateRoutes />
    </AffiliateProvider>
  );
}
