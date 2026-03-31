import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface FloatingNavProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (id: any) => void;
  className?: string;
}

export default function FloatingNav({ items, activeTab, onTabChange, className }: FloatingNavProps) {
  return (
    <nav
      className={cn(
        "fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[440px] h-[68px] rounded-[26px] z-50 flex items-center justify-around px-2",
        "bg-white/70 backdrop-blur-[20px] border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.1)]",
        "dark:bg-[#0A0A0B]/85 dark:border-white/[0.07]",
        className
      )}
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const isFocus = item.id === 'focus';
        const isMap = item.id === 'syllabus';
        const isArena = item.id === 'focus';

        return (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "relative flex-1 h-full flex flex-col items-center justify-center transition-all duration-500",
              isActive ? "text-primary" : "text-tertiary/40"
            )}
          >
            {/* Active pill */}
            {isActive && !isFocus && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-x-2 inset-y-2 rounded-[18px] -z-10"
                style={{ background: 'rgba(74,144,226,0.08)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}

            {/* Icon + label */}
            <div className={cn(
              "flex flex-col items-center justify-center gap-1",
              isFocus && [
                "w-[52px] h-[52px] rounded-full -translate-y-1 z-10",
                "shadow-[0_0_24px_rgba(74,144,226,0.35)]",
              ].join(" ")
            )}
              style={isFocus ? { background: 'var(--color-accent)' } : {}}
            >
              <item.icon
                size={isFocus ? 26 : 22}
                className="transition-colors duration-300"
                style={{
                  color: isFocus ? '#fff' : isActive ? 'var(--color-accent)' : undefined
                }}
                fill={isActive || isFocus ? "currentColor" : "none"}
              />

              {isActive && !isFocus && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, y: 2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="text-[9px] font-medium tracking-widest uppercase"
                  style={{ color: 'var(--color-accent)', letterSpacing: '0.1em' }}
                >
                  {/* Map / Arena dual-tab label overrides */}
                  {isMap ? 'Map' : isArena ? 'Arena' : item.label}
                </motion.span>
              )}
            </div>

            {/* Focus button dual-label */}
            {isFocus && (
              <span className="absolute -bottom-[18px] text-[9px] font-medium uppercase tracking-widest"
                style={{ color: 'var(--color-accent)', letterSpacing: '0.12em' }}>
                Arena
              </span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
