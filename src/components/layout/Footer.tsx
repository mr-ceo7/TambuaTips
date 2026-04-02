import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaTiktok } from 'react-icons/fa';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 group-hover:scale-110 transition-transform">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-zinc-50 uppercase">
                Tambua<span className="text-emerald-500">Tips</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Your premium sports intelligence hub. Data-driven insights, live scores, and expert betting tips.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/fixtures', label: 'Fixtures' },
                { to: '/standings', label: 'Standings' },
                { to: '/news', label: 'News' },
                { to: '/tips', label: 'Tips' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Premium</h4>
            <ul className="space-y-2.5">
              <li><Link to="/tips" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">Free Tips</Link></li>
              <li><Link to="/tips" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">Premium Tips</Link></li>
              <li><Link to="/tips" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">Tip History</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Connect</h4>
            <div className="flex gap-3">
              <a href="https://whatsapp.com/channel/0029Vb7T8A9DOQIgpMjX7F0f" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hover:scale-110 active:scale-95">
                <FaWhatsapp size={16} />
              </a>
              <a href="https://t.me/tambuatips" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hover:scale-110 active:scale-95">
                <FaTelegramPlane size={16} />
              </a>
              <a href="https://www.instagram.com/tambuatips?igsh=MXNkN3d2c2dvaXN2cQ==" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hover:scale-110 active:scale-95">
                <FaInstagram size={16} />
              </a>
              <a href="https://www.tiktok.com/@tambuatips_.1?_r=1&_t=ZS-95BTHwRMkSL" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hover:scale-110 active:scale-95">
                <FaTiktok size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} TambuaTips. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Gamble responsibly. 18+ only.
          </p>
        </div>
      </div>
    </footer>
  );
}
