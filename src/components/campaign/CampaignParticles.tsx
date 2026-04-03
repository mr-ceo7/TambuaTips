import React, { useMemo } from 'react';
import { useCampaign } from '../../context/CampaignContext';

/**
 * CampaignParticles
 * 
 * A lightweight, pure-CSS confetti/particle overlay that renders when
 * the active campaign has `use_particle_effects` enabled.
 * 
 * Uses CSS keyframes only — no JS animation loop, no external libraries.
 * Positioned as a fixed overlay with pointer-events: none so it never
 * blocks user interaction.
 */
export function CampaignParticles() {
  const { activeCampaign } = useCampaign();

  const particles = useMemo(() => {
    if (!activeCampaign?.use_particle_effects) return [];
    
    const themeColor = activeCampaign.theme_color_hex || '#10b981';
    const colors = [themeColor, '#fbbf24', '#f472b6', '#818cf8', '#34d399', themeColor + '80'];
    const shapes = ['●', '■', '◆', '▲', '★'];
    
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 8 + Math.random() * 10,
      size: 4 + Math.random() * 8,
      color: colors[i % colors.length],
      shape: shapes[i % shapes.length],
      opacity: 0.15 + Math.random() * 0.25,
      drift: -30 + Math.random() * 60,
    }));
  }, [activeCampaign?.use_particle_effects, activeCampaign?.theme_color_hex]);

  if (!activeCampaign?.use_particle_effects || particles.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes campaign-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: var(--particle-opacity);
          }
          90% {
            opacity: var(--particle-opacity);
          }
          100% {
            transform: translateY(105vh) rotate(720deg) translateX(var(--particle-drift));
            opacity: 0;
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[1] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute top-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              color: p.color,
              animation: `campaign-fall ${p.duration}s ${p.delay}s linear infinite`,
              '--particle-opacity': p.opacity,
              '--particle-drift': `${p.drift}px`,
            } as React.CSSProperties}
          >
            {p.shape}
          </span>
        ))}
      </div>
    </>
  );
}
