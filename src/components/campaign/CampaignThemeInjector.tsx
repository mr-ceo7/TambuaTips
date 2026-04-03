import React, { useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';

/**
 * CampaignThemeInjector
 * 
 * When an active campaign has a `theme_color_hex`, this component injects
 * CSS custom properties onto :root that override the default emerald accent.
 * 
 * This is purely additive — when no campaign is active or no color is set,
 * nothing happens and the default theme remains untouched.
 */
export function CampaignThemeInjector() {
  const { activeCampaign } = useCampaign();

  useEffect(() => {
    const hex = activeCampaign?.theme_color_hex;
    if (!hex) {
      // Clean up any previously injected style
      const existing = document.getElementById('campaign-theme-style');
      if (existing) existing.remove();
      return;
    }

    // Convert hex to RGB for Tailwind-compatible color usage
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const css = `
      :root {
        --campaign-color: ${hex};
        --campaign-color-rgb: ${r}, ${g}, ${b};
        --campaign-color-light: ${hex}33;
      }
      
      /* Override emerald accents globally with campaign color */
      .bg-emerald-500 { background-color: var(--campaign-color) !important; }
      .text-emerald-500 { color: var(--campaign-color) !important; }
      .text-emerald-400 { color: var(--campaign-color) !important; }
      .border-emerald-500 { border-color: var(--campaign-color) !important; }
      .border-emerald-500\\/30 { border-color: rgba(var(--campaign-color-rgb), 0.3) !important; }
      .bg-emerald-500\\/10 { background-color: rgba(var(--campaign-color-rgb), 0.1) !important; }
      .bg-emerald-500\\/20 { background-color: rgba(var(--campaign-color-rgb), 0.2) !important; }
      .hover\\:bg-emerald-400:hover { background-color: var(--campaign-color) !important; filter: brightness(1.1); }
      .shadow-emerald-500\\/10 { --tw-shadow-color: rgba(var(--campaign-color-rgb), 0.1) !important; }
      .shadow-emerald-500\\/20 { --tw-shadow-color: rgba(var(--campaign-color-rgb), 0.2) !important; }
      .focus\\:border-emerald-500:focus { border-color: var(--campaign-color) !important; }
      .focus\\:ring-emerald-500:focus { --tw-ring-color: var(--campaign-color) !important; }
    `;

    let styleEl = document.getElementById('campaign-theme-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'campaign-theme-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;

    return () => {
      const el = document.getElementById('campaign-theme-style');
      if (el) el.remove();
    };
  }, [activeCampaign?.theme_color_hex]);

  return null;
}
