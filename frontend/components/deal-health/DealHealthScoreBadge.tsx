import React from 'react';

interface DealHealthScoreBadgeProps {
  score: number;
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DealHealthScoreBadge({ score, status, size = 'md' }: DealHealthScoreBadgeProps) {
  let bgColor = 'bg-emerald-500';
  let textColor = 'text-white';
  
  if (status === 'CRITICAL' || score < 50) {
    bgColor = 'bg-red-500';
  } else if (status === 'AT_RISK' || score < 80) {
    bgColor = 'bg-amber-500';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${bgColor} ${textColor} ${sizeClasses[size]}`}>
      <span className="font-mono">{score}/100</span>
      <span className="uppercase tracking-wider opacity-90">{status.replace('_', ' ')}</span>
    </span>
  );
}
