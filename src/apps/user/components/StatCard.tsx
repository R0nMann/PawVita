import { useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  gradient?: string;
  icon: string;
  trend?: { value: number; label: string };
  delay?: number;
}

export default function StatCard({ label, value, suffix = '', prefix = '', gradient = 'gradient-card-green', icon, trend, delay = 0 }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    // Both timers are cleared on change: the value arrives from the API after first render.
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      const duration = 1200;
      const steps = 40;
      const increment = value / steps;
      let current = 0;
      interval = setInterval(() => {
        current += increment;
        if (current >= value) { setDisplayed(value); clearInterval(interval); }
        else setDisplayed(Math.floor(current));
      }, duration / steps);
    }, delay);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [value, delay]);

  const formatted = displayed >= 1000000
    ? (displayed / 1000000).toFixed(1) + 'M'
    : displayed >= 1000
    ? (displayed / 1000).toFixed(0) + 'K'
    : displayed.toString();

  return (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-card transition-all duration-300 shadow-card-hover cursor-default`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold font-display tracking-tight">
            {prefix}{formatted}{suffix}
          </p>
          {trend && (
            <p className={`text-xs mt-1.5 font-medium ${trend.value >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}
