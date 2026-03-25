/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { StandingsPage } from './pages/StandingsPage';
import { NewsPage } from './pages/NewsPage';
import { TipsPage } from './pages/TipsPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/fixtures" element={<FixturesPage />} />
          <Route path="/match/:id" element={<MatchDetailPage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/tips" element={<TipsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
