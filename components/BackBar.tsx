import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackBarProps {
  onBack: () => void;
  label: string;
}

/**
 * Back-action bar that:
 *  - On mobile: sticks just under the mobile top header so it never gets scrolled
 *    out of view (`top: var(--mobile-header-h)`). Uses a translucent backdrop
 *    blur so content underneath softly shows through, matching the header.
 *  - On desktop: rendered as a normal inline button at the top of the page body.
 *
 * The mobile bar bleeds full-width by negating the parent's horizontal padding
 * (`-mx-4 px-4`) so the divider line spans the viewport.
 */
export const BackBar: React.FC<BackBarProps> = ({ onBack, label }) => {
  return (
    <div
      className="
        sticky z-30
        -mx-4 md:mx-0 px-4 md:px-0
        py-2.5 md:py-0
        bg-stone-50/90 md:bg-transparent
        backdrop-blur md:backdrop-blur-none
        border-b md:border-b-0 border-stone-200
        mb-4 md:mb-5
      "
      style={{ top: 'var(--mobile-header-h, 64px)' }}
    >
      <button onClick={onBack} className="btn btn-secondary">
        <ArrowLeft size={18} />
        {label}
      </button>
    </div>
  );
};
