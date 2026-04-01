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
  locked?: boolean;
}

export default function FloatingNav({ items, activeTab, onTabChange, className, locked }: FloatingNavProps) {
  return (
    <nav
      className={cn(
        "fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[480px] h-[64px] rounded-[26px] z-50 flex items-center justify-around px-1",
        "bg-[rgba(21,24,33,0.7)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.05)] shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
        locked && "opacity-30 pointer-events-none",
        className
      )}
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
      }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const isFocus = item.id === 'focus';

        return (
          <motion.button
            key={item.id}
            onClick={() => !locked && onTabChange(item.id)}
            whileTap={{ scale: 0.91 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "relative flex-1 h-full flex flex-col items-center justify-center transition-all duration-500",
              isActive ? "text-primary" : "text-tertiary/40"
            )}
          >
            {/* Active pill (non-focus tabs) */}
            {isActive && !isFocus && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-x-1 inset-y-2 rounded-[18px] -z-10"
                style={{ background: 'rgba(74,144,226,0.07)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}

            <div className={cn(
              "flex flex-col items-center justify-center gap-[3px]",
              isFocus && "w-[48px] h-[48px] rounded-full -translate-y-[3px] z-10 shadow-[0_0_20px_rgba(74,144,226,0.3)]"
            )}
              style={isFocus ? { background: 'var(--color-accent)' } : {}}
            >
              <item.icon
                size={isFocus ? 22 : 20}
                className="transition-colors duration-300"
                style={{
                  color: isFocus ? '#fff' : isActive ? '#6C8CFF' : '#8A90A2'
                }}
                fill={isActive || isFocus ? "currentColor" : "none"}
                strokeWidth={isActive || isFocus ? 2 : 1.5}
              />

              {isActive && !isFocus && (
                <motion.span
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-[9px] font-medium tracking-wider"
                  style={{ color: 'var(--color-accent)', letterSpacing: '0.08em' }}
                >
                  {item.label === 'Syllabus' ? 'Map' :
                   item.label === 'Flashcards' ? 'Recall' : item.label}
                </motion.span>
              )}
            </div>

            {/* Focus "Arena" sub-label */}
            {isFocus && isActive && (
              <span className="absolute -bottom-[17px] text-[8px] font-medium uppercase tracking-widest"
                style={{ color: 'var(--color-accent)' }}>Arena</span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
