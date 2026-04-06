import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  canonical?: string;
  structData?: object | object[];
  noindex?: boolean;
}

export function SEO({ 
  title, 
  description = "TambuaTips — Your premium sports intelligence hub. Get expert betting tips, live scores, match previews, and deep sports analytics. Stop Guessing. Start Winning.", 
  keywords = "sports, betting tips, football, soccer, live scores, fixtures, standings, premier league, la liga, analytics", 
  url = "https://tambuatips.com/", 
  image = "https://tambuatips.com/og-image.png",
  canonical,
  structData,
  noindex = false
}: SEOProps) {
  const fullTitle = title ? `${title} — TambuaTips` : 'TambuaTips — Intelligent Sports Predictions';
  const siteUrl = url || "https://tambuatips.com/";

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Structured Data (JSON-LD) */}
      {structData && (
        <script type="application/ld+json">
          {JSON.stringify(structData)}
        </script>
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={siteUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
