import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
}

export function SEO({ 
  title, 
  description = "TambuaTips — Your premium sports intelligence hub. Get expert betting tips, live scores, match previews, and deep sports analytics. Stop Guessing. Start Winning.", 
  keywords = "sports, betting tips, football, soccer, live scores, fixtures, standings, premier league, la liga, analytics", 
  url = "https://v2.tambuatips.com/", 
  image = "https://v2.tambuatips.com/og-image.png" 
}: SEOProps) {
  const fullTitle = title ? `${title} — TambuaTips` : 'TambuaTips — Intelligent Sports Predictions';

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
