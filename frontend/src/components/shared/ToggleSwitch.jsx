import React from 'react';
import { Check } from 'lucide-react';

export default function ToggleSwitch({ checked, onChange, tc, className = '' }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 items-center rounded-full p-0.5 border transition-all focus:outline-none ${
        checked ? `${tc.border} ${tc.bg}` : 'border-[#3b3b42] bg-[#25252a]'
      } ${className}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {checked ? (
          <Check className={`h-3.5 w-3.5 ${tc.text}`} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        )}
      </span>
    </button>
  );
}