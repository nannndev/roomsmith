import React from 'react';
import { PlayMode } from '../game/types';

interface TitleOverlayProps {
  onStart: (mode: PlayMode) => void;
  onStartNewSite: () => void;
  onContinueSaved?: () => void;
  hasSavedDesign?: boolean;
  completedCount: number;
  totalCommissions: number;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onStart,
  onStartNewSite,
  onContinueSaved,
  hasSavedDesign = false,
  completedCount,
  totalCommissions,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center">
      {/* Soft warm linen sunlit scrim on the left, keeping the live cozy 3D villa open on the right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(96deg, rgba(247, 239, 227, 0.95) 0%, rgba(247, 239, 227, 0.84) 35%, rgba(247, 239, 227, 0.18) 64%, rgba(247, 239, 227, 0.0) 100%)',
        }}
      />

      <div className="relative z-10 max-w-xl pl-8 sm:pl-14 pr-6 py-10 pointer-events-auto flex flex-col gap-6">
        {/* Bespoke inline SVG Warm Architectural Monogram & Title Lockup */}
        <div className="flex flex-col gap-4">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Roomsmith emblem"
            className="shrink-0"
          >
            <path
              d="M32 6L56 19.5V44.5L32 58L8 44.5V19.5L32 6Z"
              stroke="#B86B35"
              strokeWidth="2.2"
              fill="rgba(184, 107, 53, 0.12)"
            />
            <path
              d="M32 6V32M32 32L56 19.5M32 32L8 19.5M32 32V58"
              stroke="#6B5644"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
            <path
              d="M20 39V25.5L32 19L44 25.5V39L32 45.5L20 39Z"
              stroke="#33261D"
              strokeWidth="2"
              fill="rgba(250, 245, 236, 0.88)"
            />
            {/* Isometric interior room corner accent */}
            <path
              d="M32 32L44 25.5V39L32 45.5V32Z"
              fill="#B86B35"
              fillOpacity="0.78"
            />
            <path
              d="M32 19V32L20 39"
              stroke="#33261D"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#9C5422]">
              3D Architecture &amp; Interior Studio
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#33261D] leading-[1.06] [text-wrap:balance]">
              Roomsmith
            </h1>
            <p className="text-base text-[#5A4738] leading-relaxed max-w-md">
              Size your own land plot, pour custom foundations, sketch 2D floor plans, and design
              sunlit interiors freely — no budgets, pure creative freedom.
            </p>
          </div>
        </div>

        {/* Clean unboxed metadata line */}
        <div className="flex items-center gap-2.5 text-xs text-[#6B5644] font-mono-num">
          <span>Unlimited Creative Mode</span>
          <span aria-hidden="true">·</span>
          <span>Custom Land, Roof &amp; Templates</span>
          <span aria-hidden="true">·</span>
          <span>95+ 3D Assets</span>
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {hasSavedDesign && onContinueSaved && (
            <button
              type="button"
              onClick={onContinueSaved}
              className="px-6 py-3 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] active:scale-[0.98] text-[#FFFBF5] font-display font-semibold text-sm tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B86B35]"
            >
              Continue Saved Room
            </button>
          )}
          <button
            type="button"
            onClick={onStartNewSite}
            className={
              hasSavedDesign
                ? 'px-5 py-3 rounded-xl bg-[#FAF5EC] hover:bg-[#F1E8DA] active:scale-[0.98] text-[#33261D] border border-[#D4C3AA] font-display font-semibold text-sm tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B86B35]'
                : 'px-6 py-3 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] active:scale-[0.98] text-[#FFFBF5] font-display font-semibold text-sm tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B86B35]'
            }
          >
            New Land &amp; Floor Plan
          </button>
          <button
            type="button"
            onClick={() => onStart('sandbox')}
            className="px-5 py-3 rounded-xl bg-[#FAF5EC] hover:bg-[#F1E8DA] active:scale-[0.98] text-[#33261D] border border-[#D4C3AA] font-display font-semibold text-sm tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B86B35]"
          >
            Showcase Villa
          </button>
          {completedCount < totalCommissions && (
            <button
              type="button"
              onClick={() => onStart('commission')}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#6B5644] hover:text-[#33261D] hover:bg-[#FAF5EC]/70 transition-colors cursor-pointer whitespace-nowrap"
            >
              Design Briefs ({completedCount}/{totalCommissions})
            </button>
          )}
        </div>

        {/* Single flat control-hint line */}
        <p className="text-xs text-[#7D6754] tracking-wide pt-2">
          Drag Orbit · Arrows Move Object · Q/E Rotate · [/] Height · -/+ Size · WASD Pan
        </p>
      </div>
    </div>
  );
};
