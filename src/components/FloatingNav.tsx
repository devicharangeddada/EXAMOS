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
        "fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[450px] h-[68px] rounded-[24px] z-50 flex items-center justify-around px-2",
        "bg-white/75 backdrop-blur-[18px] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
        "dark:bg-[#161618]/70 dark:backdrop-blur-[20px] dark:border-white/15",
        className
      )}
      style={{
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {items.map((item, index) => {
        const isActive = activeTab === item.id;
        const isFocus = item.id === 'focus';
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative flex-1 h-full flex flex-col items-center justify-center transition-all duration-300",
              isActive ? "text-primary" : "text-tertiary/50"
            )}
          >
            {/* Liquid Shift Indicator */}
            {isActive && !isFocus && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-x-2 inset-y-2 bg-action-light/50 dark:bg-action-dark/50 rounded-[18px] -z-10"
                transition={{
                  type: "tween",
                  ease: [0.4, 0, 0.2, 1],
                  duration: 0.3
                }}
              />
            )}

            <motion.div
              whileTap={{ scale: 1.12 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                isFocus && "w-14 h-14 rounded-full bg-accent text-white shadow-[0_0_20px_rgba(94,92,230,0.4)] -translate-y-1 z-10"
              )}
            >
              <item.icon 
                size={isFocus ? 28 : 22} 
                className={cn(
                  "transition-colors duration-200",
                  isActive && !isFocus && "text-accent"
                )}
                fill={isActive || isFocus ? "currentColor" : "none"}
              />
              
              {isActive && !isFocus && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {item.label}
                </motion.span>
              )}
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}
