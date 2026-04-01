import { useMemo } from 'react';
import { cn } from '../../lib/utils';

interface VelocitySparklineProps {
  value: number;
}

export default function VelocitySparkline({ value }: VelocitySparklineProps) {
  const points = useMemo(() => {
    const base = Math.max(0, value - 40);
    return [base, base + 8, base + 15, base + 22, base + 30, value].map((v) => Math.min(100, Math.max(0, v)));
  }, [value]);

  const w = 40;
  const h = 14;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((v) => h - (v / 100) * h);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60 shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke="rgba(74,144,226,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2" fill="rgba(74,144,226,1)" />
    </svg>
  );
}
