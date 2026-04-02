import React, { useRef } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';

function TemporalIcon({ type }) {
  if (type === 'time') {
    return <Clock3 className="w-4 h-4" />;
  }
  return <CalendarDays className="w-4 h-4" />;
}

export default function TemporalInputField({
  type,
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = '',
}) {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:hover:text-zinc-500"
        title="Open picker"
      >
        <TemporalIcon type={type} />
      </button>
    </div>
  );
}
