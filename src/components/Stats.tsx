import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  subDays, 
  startOfDay, 
  isSameDay,
  eachDayOfInterval
} from 'date-fns';
import { AppState } from '../types';
import { cn } from '../lib/utils';

interface StatsProps {
  state: AppState;
}

const CALM_BEZIER = [0.22, 1, 0.36, 1];

export default function Stats({ state }: StatsProps) {
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; value: string; x: number; y: number } | null>(null);

  // [2] The Hero Component (The Progress Ring)
  const completionRate = useMemo(() => {
    const allNodes = Object.values(state.nodes);
    if (allNodes.length === 0) return 0;
    const done = allNodes.filter(n => n.status === 'done').length;
    return (done / allNodes.length) * 100;
  }, [state.nodes]);

  // [3] The Velocity Visualizer (Daily Activity)
  const dailyVelocity = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(startOfDay(new Date()), 6),
      end: startOfDay(new Date())
    });

    const dailyGoalSeconds = (state.onboarding.dailyAvailability || 4) * 3600;

    return last7Days.map(day => {
      const daySessions = state.sessions.filter(s => isSameDay(new Date(s.startTime), day));
      const totalSeconds = daySessions.reduce((acc, s) => acc + s.duration, 0);
      const height = Math.min((totalSeconds / dailyGoalSeconds), 1.2); // cap for visual
      
      return {
        date: day,
        label: format(day, 'EEE'),
        focusTime: `${Math.round(totalSeconds / 60)}m`,
        height
      };
    });
  }, [state.sessions, state.onboarding.dailyAvailability]);

  // [4] Information Grid (Today Summary)
  const todayStats = useMemo(() => {
    const today = startOfDay(new Date());
    const todaySessions = state.sessions.filter(s => isSameDay(new Date(s.startTime), today));
    const totalMins = Math.round(todaySessions.reduce((acc, s) => acc + s.duration, 0) / 60);
    const topicsCount = new Set(todaySessions.map(s => s.nodeId)).size;
    
    return [
      { label: 'Focus Time', value: `${totalMins}m` },
      { label: 'Topics Covered', value: topicsCount.toString() },
      { label: 'Sessions', value: todaySessions.length.toString() },
      { label: 'Efficiency', value: todaySessions.length > 0 ? 'High' : 'N/A' }
    ];
  }, [state.sessions]);

  // [5] The Retention Diagnostic (Weak Areas)
  const weakAreas = useMemo(() => {
    return Object.values(state.nodes)
      .filter(n => n.parentId !== null)
      .map(node => {
        const score = (node.failCount * 2) + (node.focusDifficulty * 1.5);
        return { ...node, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [state.nodes]);

  // [6] The Discipline Grid (Heatmap)
  const heatmapData = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(startOfDay(new Date()), 29),
      end: startOfDay(new Date())
    });

    return last30Days.map(day => {
      const daySessions = state.sessions.filter(s => isSameDay(new Date(s.startTime), day));
      const totalMins = daySessions.reduce((acc, s) => acc + s.duration, 0) / 60;
      
      let level = 0;
      if (totalMins > 0) level = 1;
      if (totalMins > 60) level = 2;
      if (totalMins > 120) level = 3;

      return { date: day, level };
    });
  }, [state.sessions]);

  return (
    <div className="flex flex-col gap-[24px] p-[16px] pb-[100px] max-w-[450px] mx-auto overflow-y-auto h-full scrollbar-hide">
      
      {/* [2] The Hero Component (The Progress Ring) */}
      <section className="flex flex-col items-center justify-center py-[24px]">
        <div className="relative w-[150px] h-[150px]">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="75"
              cy="75"
              r="70"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="10"
              className="opacity-10"
            />
            <motion.circle
              cx="75"
              cy="75"
              r="70"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="10"
              strokeDasharray="440"
              initial={{ strokeDashoffset: 440 }}
              animate={{ strokeDashoffset: 440 - (440 * completionRate) / 100 }}
              transition={{ duration: 0.8, ease: CALM_BEZIER }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[24px] font-bold text-primary leading-none">
              {Math.round(completionRate)}%
            </span>
            <span className="text-[12px] font-medium text-tertiary mt-[4px]">Syllabus Done</span>
          </div>
        </div>
      </section>

      {/* [3] The Velocity Visualizer (Daily Bars) */}
      <section className="space-y-[12px]">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-tertiary px-[4px]">Velocity</h3>
        <div className="h-[130px] flex items-end justify-between px-[8px] relative">
          {dailyVelocity.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-[8px] group">
              <div 
                className="relative w-[10px] h-[100px] bg-accent/10 rounded-[6px] cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveTooltip({
                    label: format(day.date, 'MMM do'),
                    value: day.focusTime,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10
                  });
                }}
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-accent rounded-[6px]"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: day.height }}
                  style={{ originY: 1 }}
                  transition={{ duration: 0.6, ease: CALM_BEZIER, delay: i * 0.05 }}
                />
              </div>
              <span className="text-[10px] font-bold text-tertiary uppercase">{day.label}</span>
            </div>
          ))}

          <AnimatePresence>
            {activeTooltip && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveTooltip(null)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  style={{ left: activeTooltip.x, top: activeTooltip.y, transform: 'translate(-50%, -100%)' }}
                  className="fixed z-50 bg-surface-dark/90 backdrop-blur-md border border-white/10 p-[8px] rounded-[8px] shadow-xl pointer-events-none"
                >
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{activeTooltip.label}</p>
                  <p className="text-[14px] font-mono font-bold text-white">{activeTooltip.value}</p>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* [4] Information Grid (Today Summary) */}
      <section className="space-y-[12px]">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-tertiary px-[4px]">Today</h3>
        <div className="grid grid-cols-2 gap-[12px]">
          {todayStats.map((stat, i) => (
            <div key={i} className="h-[80px] bg-accent/[0.05] rounded-[16px] p-[12px] flex flex-col justify-between">
              <span className="text-[12px] font-medium text-tertiary">{stat.label}</span>
              <span className="text-[20px] font-mono font-bold text-primary">{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* [5] The Retention Diagnostic (Weak Areas) */}
      <section className="space-y-[12px]">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-tertiary px-[4px]">Growth Potential</h3>
        <div className="flex flex-col gap-[12px]">
          {weakAreas.length === 0 ? (
            <p className="text-[12px] text-tertiary italic text-center py-[12px]">Complete sessions to see diagnostics.</p>
          ) : (
            weakAreas.map(topic => (
              <div key={topic.id} className="bg-accent/[0.03] border border-accent/5 rounded-[12px] p-[12px] space-y-[8px]">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-semibold text-primary truncate max-w-[200px]">{topic.title}</span>
                  <span className="text-[10px] font-mono text-tertiary">Score: {topic.score.toFixed(1)}</span>
                </div>
                <div className="h-[6px] w-full bg-accent/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ 
                      background: `linear-gradient(to right, rgba(var(--color-accent-rgb), 0.3), rgba(var(--color-accent-rgb), 1))` 
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((topic.score / 20) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: CALM_BEZIER }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* [6] The Discipline Grid (Heatmap) */}
      <section className="space-y-[12px]">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-tertiary px-[4px]">Consistency</h3>
        <div className="flex flex-wrap gap-[4px] justify-center">
          {heatmapData.map((day, i) => (
            <div 
              key={i} 
              className={cn(
                "w-[14px] h-[14px] rounded-[2px] transition-all duration-300",
                day.level === 0 && "bg-accent/[0.05]",
                day.level === 1 && "bg-accent/[0.3]",
                day.level === 2 && "bg-accent/[0.6]",
                day.level === 3 && "bg-accent/[1.0]"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-bold text-tertiary uppercase tracking-widest px-[4px]">
          <span>Last 30 Days</span>
          <div className="flex gap-[4px] items-center">
            <span>Less</span>
            <div className="w-[8px] h-[8px] bg-accent/[0.05] rounded-[1px]" />
            <div className="w-[8px] h-[8px] bg-accent/[0.3] rounded-[1px]" />
            <div className="w-[8px] h-[8px] bg-accent/[0.6] rounded-[1px]" />
            <div className="w-[8px] h-[8px] bg-accent/[1.0] rounded-[1px]" />
            <span>More</span>
          </div>
        </div>
      </section>

    </div>
  );
}
