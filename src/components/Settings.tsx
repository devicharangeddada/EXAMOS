import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, AppState } from '../types';
import { 
  Palette, Volume2, Bell, Timer, Database, Settings as SettingsIcon, 
  ChevronRight, ChevronLeft, Sun, Moon, CloudMoon, Sparkles, 
  Maximize, Download, Trash2, Calendar, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { importDataFromText } from '../lib/backup';
import { useHaptics } from '../lib/haptics';

interface SettingsProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  examDate: string;
  setExamDate: (date: string) => void;
  onReset: () => void;
  onImportState: (state: AppState) => void;
}

type View = 'root' | 'appearance' | 'sound' | 'notifications' | 'time' | 'data' | 'advanced';

export default function Settings({ settings, updateSettings, examDate, setExamDate, onReset, onImportState }: SettingsProps) {
  const [view, setView] = useState<View>('root');
  const [hoverDensity, setHoverDensity] = useState<AppSettings['density'] | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportState, setPendingImportState] = useState<AppState | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { pulse } = useHaptics();

  const handleSelectBackupFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleBackupFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('validating');
      setImportError(null);
      const text = await file.text();
      const result = importDataFromText(text, { dryRun: true });

      if (!result.ok) {
        setImportStatus('error');
        setPendingImportState(null);
        setShowImportConfirm(false);
        setImportError((result as { ok: false; error: string }).error);
        return;
      }

      setImportStatus('idle');
      setImportError(null);
      setPendingImportState(result.state);
      setShowImportConfirm(true);
    } catch {
      setImportStatus('error');
      setPendingImportState(null);
      setShowImportConfirm(false);
      setImportError('Unable to read backup file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImportState) return;
    // Commit backup into running app state and storage
    const serialized = JSON.stringify(pendingImportState);
    localStorage.setItem('examflow_os_data', serialized);
    onImportState(pendingImportState);
    setShowImportConfirm(false);
    setPendingImportState(null);
  };

  const activeDensity = hoverDensity || settings.density;

  const exportData = () => {
    const data = localStorage.getItem('examflow_os_data');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `examflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const renderRoot = () => (
    <motion.div 
      key="root"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-nano"
    >
      <CategoryRow 
        icon={<Palette size={20} />} 
        title="Appearance" 
        description="Scale, Themes, Accents" 
        onClick={() => setView('appearance')} 
      />
      <CategoryRow 
        icon={<Volume2 size={20} />} 
        title="Sound & Focus" 
        description="Ambient sets, Volume, Timers" 
        onClick={() => setView('sound')} 
      />
      <CategoryRow 
        icon={<Bell size={20} />} 
        title="Notifications" 
        description="Reminders, Streaks" 
        onClick={() => setView('notifications')} 
      />
      <CategoryRow 
        icon={<Timer size={20} />} 
        title="Time & Behavior" 
        description="Pomodoro lengths, Logic #7" 
        onClick={() => setView('time')} 
      />
      <CategoryRow 
        icon={<Database size={20} />} 
        title="Data" 
        description="Backup, Export, Truth System #9" 
        onClick={() => setView('data')} 
      />
      <CategoryRow 
        icon={<SettingsIcon size={20} />} 
        title="Advanced" 
        description="Experimental, System info" 
        onClick={() => setView('advanced')} 
      />
    </motion.div>
  );

  const renderAppearance = () => (
    <motion.div 
      key="appearance"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Appearance" onBack={() => setView('root')} />
      
      {/* Live Preview System */}
      <div className="space-y-small">
        <p className="caption-sm text-tertiary px-2">Live Preview</p>
        <div className={cn(
          "surface-card border border-border-color overflow-hidden transition-all duration-200 ease-out p-medium",
          `density-${activeDensity}`
        )}>
          <div className="space-y-[var(--space-small)]">
            <div className="flex items-center gap-[var(--space-nano)]">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <h4 className="header-md">Focus Mode Preview</h4>
            </div>
            <p className="body-md text-secondary">
              Proportions remain identical; only density changes.
            </p>
            <button className="primary-button w-full">
              Action Button
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Interface Density</p>
        <div className="bg-action-light dark:bg-action-dark p-1 rounded-2xl flex gap-1">
          {(['compact', 'default', 'comfortable'] as const).map(d => (
            <button
              key={d}
              onClick={() => updateSettings({ density: d })}
              onMouseEnter={() => setHoverDensity(d)}
              onMouseLeave={() => setHoverDensity(null)}
              className={cn(
                "flex-1 py-2 rounded-xl body-md font-medium transition-all press-scale",
                settings.density === d 
                  ? "bg-accent text-white shadow-lg shadow-accent/20" 
                  : "hover:bg-action-light/50 dark:hover:bg-action-dark/50 text-secondary"
              )}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark', 'night', 'auto'] as const).map(t => (
            <button
              key={t}
              onClick={() => updateSettings({ theme: t })}
              className={cn(
                "surface-card flex items-center gap-3 p-3 border transition-all press-scale",
                settings.theme === t 
                  ? "border-accent bg-accent/5" 
                  : "border-transparent hover:bg-action-light/50 dark:hover:bg-action-dark/50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                t === 'light' ? "bg-orange-500/10 text-orange-500" :
                t === 'dark' ? "bg-accent/10 text-accent" :
                t === 'night' ? "bg-indigo-500/10 text-indigo-500" : "bg-success/10 text-success"
              )}>
                {t === 'light' ? <Sun size={16} /> : t === 'dark' ? <Moon size={16} /> : t === 'night' ? <CloudMoon size={16} /> : <Sparkles size={16} />}
              </div>
              <span className="body-md font-medium capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderSound = () => (
    <motion.div 
      key="sound"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Sound & Focus" onBack={() => setView('root')} />
      
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Ambient Engine</p>
        <div className="grid grid-cols-3 gap-2">
          {(['white', 'rain', 'brown'] as const).map(s => (
            <button
              key={s}
              onClick={() => updateSettings({ soundType: s })}
              className={cn(
                "body-md font-medium py-3 rounded-xl transition-all press-scale border",
                settings.soundType === s 
                  ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                  : "bg-action-light dark:bg-action-dark border-transparent text-secondary"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-small px-2">
        <div className="flex justify-between items-center">
          <label className="caption-sm text-tertiary">Master Volume</label>
          <span className="caption-sm font-semibold text-accent">{Math.round(settings.volume * 100)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-action-light dark:bg-action-dark overflow-hidden relative">
          <motion.div
            initial={false}
            animate={{ width: `${settings.volume * 100}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #1D4ED8, #5B21B6)'
            }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              const prev = settings.volume;
              if ((next === 0 || next === 1) && next !== prev) {
                pulse('heavy');
              }
              updateSettings({ volume: next });
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <ToggleRow 
        title="Auto-play Ambient" 
        description="Start soundscape when focus begins" 
        enabled={settings.autoPlay} 
        onToggle={() => updateSettings({ autoPlay: !settings.autoPlay })} 
      />
    </motion.div>
  );

  const renderData = () => (
    <motion.div 
      key="data"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Data Management" onBack={() => setView('root')} />
      
      <div className="space-y-nano">
        <CategoryRow 
          icon={<Database size={20} />} 
          title="Restore System" 
          description={importStatus === 'validating' ? 'Validating backup…' : 'Import a verified Echoless backup'} 
          onClick={handleSelectBackupFile} 
        />
        <CategoryRow 
          icon={<Download size={20} />} 
          title="Export Backup" 
          description="Download your study system as JSON" 
          onClick={exportData} 
        />
        <CategoryRow 
          icon={<Trash2 size={20} className="text-error" />} 
          title="Reset All" 
          description="Wipe all data and factory reset" 
          onClick={onReset} 
        />
      </div>

      <input 
        ref={fileInputRef}
        type="file" 
        accept="application/json" 
        className="hidden" 
        onChange={handleBackupFileChange}
      />

      <AnimatePresence>
        {showImportConfirm && pendingImportState && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="surface-card p-medium border border-border-color rounded-2xl space-y-small"
          >
            <div className="space-y-nano">
              <p className="body-md font-medium text-primary">Verified backup detected</p>
              <p className="caption-sm text-secondary">
                Restoring will overwrite your current syllabus, sessions, and settings with this backup.
              </p>
            </div>
            <div className="flex gap-small">
              <button 
                onClick={() => { setShowImportConfirm(false); setPendingImportState(null); }}
                className="secondary-button flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport}
                className="primary-button flex-1"
              >
                Apply Restore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {importError && (
        <p className="caption-sm text-error px-2">
          {importError}
        </p>
      )}
    </motion.div>
  );

  const renderNotifications = () => (
    <motion.div 
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Notifications" onBack={() => setView('root')} />
      
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Study Reminders</p>
        <ToggleRow 
          title="Daily Goal Reminder" 
          description="Notify when daily study goal is not met" 
          enabled={true} 
          onToggle={() => {}} 
        />
        <ToggleRow 
          title="Streak Protection" 
          description="Alert 1 hour before streak expires" 
          enabled={true} 
          onToggle={() => {}} 
        />
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">System Alerts</p>
        <ToggleRow 
          title="Exam Urgency" 
          description="Show countdown on lock screen" 
          enabled={false} 
          onToggle={() => {}} 
        />
      </div>
    </motion.div>
  );

  const renderTime = () => (
    <motion.div 
      key="time"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Time & Behavior" onBack={() => setView('root')} />
      
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Focus Intervals</p>
        <CategoryRow 
          icon={<Timer size={20} />} 
          title="Pomodoro Length" 
          description="Current: 25 Minutes" 
          onClick={() => {}} 
        />
        <CategoryRow 
          icon={<Zap size={20} />} 
          title="Short Break" 
          description="Current: 5 Minutes" 
          onClick={() => {}} 
        />
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Behavioral Logic</p>
        <ToggleRow 
          title="Auto-Start Breaks" 
          description="Logic #7: Seamless transitions" 
          enabled={true} 
          onToggle={() => {}} 
        />
        <ToggleRow 
          title="Strict Mode" 
          description="Disable navigation during focus" 
          enabled={false} 
          onToggle={() => {}} 
        />
      </div>
    </motion.div>
  );

  const renderAdvanced = () => (
    <motion.div 
      key="advanced"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-medium"
    >
      <SubpageHeader title="Advanced" onBack={() => setView('root')} />
      
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Experimental</p>
        <ToggleRow 
          title="Haptic Feedback" 
          description="Simulated vibrations on interaction" 
          enabled={true} 
          onToggle={() => {}} 
        />
        <ToggleRow 
          title="GPU Acceleration" 
          description="Force hardware rendering for animations" 
          enabled={true} 
          onToggle={() => {}} 
        />
      </div>

      <div className="surface-card p-medium space-y-small">
        <div className="flex justify-between items-center">
          <span className="body-md text-secondary">System Version</span>
          <span className="body-md font-mono text-primary">v1.2.4-sanctuary</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="body-md text-secondary">Build ID</span>
          <span className="body-md font-mono text-primary">IMD-ECH-PRIME-01</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-xl mx-auto py-header">
      <header className="space-y-1 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Settings</h2>
        <p className="text-tertiary">Developed by imdvichrn &amp; Echoless</p>
      </header>

      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {view === 'root' && renderRoot()}
          {view === 'appearance' && renderAppearance()}
          {view === 'sound' && renderSound()}
          {view === 'data' && renderData()}
          {view === 'notifications' && renderNotifications()}
          {view === 'time' && renderTime()}
          {view === 'advanced' && renderAdvanced()}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CategoryRow({ icon, title, description, onClick }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-medium px-medium rounded-2xl transition-all press-scale group relative",
        "h-[var(--row-height)] hover:bg-action-light/50 dark:hover:bg-action-dark/50"
      )}
    >
      <div className="w-icon h-icon flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="flex-1 text-left space-y-0">
        <p className="text-[15px] font-medium leading-none text-primary">{title}</p>
        <p className="text-[12px] text-secondary leading-tight">{description}</p>
      </div>
      <ChevronRight size={18} className="text-tertiary group-hover:text-secondary transition-colors" />
      
      {/* Divider */}
      <div className="absolute bottom-0 left-[var(--space-large)] right-0 h-[0.5px] bg-border-color" />
    </button>
  );
}

function ToggleRow({ title, description, enabled, onToggle }: {
  title: string,
  description: string,
  enabled: boolean,
  onToggle: () => void
}) {
  return (
    <div className="w-full h-[var(--row-height)] flex items-center gap-medium px-medium rounded-2xl relative">
      <div className="flex-1 text-left">
        <p className="text-[15px] font-medium leading-none text-primary">{title}</p>
        <p className="text-[12px] text-secondary leading-tight">{description}</p>
      </div>
      <button 
        onClick={onToggle}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative",
          enabled ? "bg-accent" : "bg-action-light dark:bg-action-dark"
        )}
      >
        <motion.div 
          animate={{ x: enabled ? 26 : 2 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
      <div className="absolute bottom-0 left-[var(--space-large)] right-0 h-[0.5px] bg-border-color" />
    </div>
  );
}

function SubpageHeader({ title, onBack }: { title: string, onBack: () => void }) {
  return (
    <div className="flex items-center gap-small mb-4">
      <button 
        onClick={onBack}
        className="w-10 h-10 rounded-full bg-action-light dark:bg-action-dark flex items-center justify-center press-scale text-primary"
      >
        <ChevronLeft size={20} />
      </button>
      <h3 className="title-lg !text-[18px]">{title}</h3>
    </div>
  );
}
