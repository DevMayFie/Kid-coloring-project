import React from 'react';

export interface TooltipProps {
  text: string;
  isVisible: boolean;
  shortcut?: string;
  id?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, isVisible, shortcut, id }) => {
  return (
    <div
      id={id}
      role="tooltip"
      aria-hidden={!isVisible}
      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-all duration-200 ease-out z-40 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95'
      }`}
    >
      <div className="bg-gray-950 text-white text-[11px] font-semibold px-2.5 py-1.2 rounded-lg shadow-xl border border-gray-700/80 whitespace-nowrap flex items-center gap-1.5">
        <span>{text}</span>
        {shortcut && (
          <span className="px-1.5 py-0.5 bg-gray-800 text-[9px] text-amber-300 font-mono rounded border border-gray-600 font-bold">
            {shortcut}
          </span>
        )}
      </div>
      {/* Downward pointer caret */}
      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-950 mx-auto" />
    </div>
  );
};
