import React from 'react';

export interface ProgressRingProps {
  /** Size in pixels (width and height) */
  size?: number;
  /** Stroke width of the ring in pixels */
  strokeWidth?: number;
  /**
   * Progress value between 0 and 100.
   * If provided, renders a determinate progress arc.
   * If omitted, renders an indeterminate rotating loop.
   */
  progress?: number;
  /** Custom class names */
  className?: string;
  /** Color of the background ring track */
  trackColor?: string;
  /** Color of the active foreground progress arc */
  indicatorColor?: string;
  /** Optional center text or badge */
  showPercentage?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 18,
  strokeWidth = 2.5,
  progress,
  className = '',
  trackColor = 'rgba(255, 255, 255, 0.28)',
  indicatorColor = '#ffffff',
  showPercentage = false,
}) => {
  const center = size / 2;
  const radius = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;

  const isDeterminate = typeof progress === 'number' && !isNaN(progress);
  const clamped = isDeterminate ? Math.min(100, Math.max(0, progress)) : 0;
  // Calculate dash offset for clockwise filling starting from top (12 o'clock)
  const strokeDashoffset = isDeterminate
    ? circumference - (clamped / 100) * circumference
    : circumference * 0.35;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={isDeterminate ? Math.round(clamped) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`w-full h-full ${isDeterminate ? '-rotate-90' : 'animate-spin'}`}
      >
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Dynamic active progress indicator circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={indicatorColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: isDeterminate ? 'stroke-dashoffset 200ms cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
          }}
        />
      </svg>

      {showPercentage && isDeterminate && (
        <span
          className="absolute text-[8px] font-bold text-white leading-none select-none"
          style={{ fontSize: Math.max(8, Math.floor(size * 0.32)) }}
        >
          {Math.round(clamped)}
        </span>
      )}
    </div>
  );
};
