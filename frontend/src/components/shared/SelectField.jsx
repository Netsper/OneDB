import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function SelectField({
  wrapperClassName = 'w-full',
  className = '',
  children,
  ...props
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className={`${className} pr-8`}>
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex flex-col items-center justify-center text-zinc-500">
        <ChevronUp className="w-2.5 h-2.5 -mb-[2px]" />
        <ChevronDown className="w-2.5 h-2.5 -mt-[2px]" />
      </span>
    </div>
  );
}
