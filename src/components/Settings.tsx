import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, AppState } from '../types';
import {
  Palette, Volume2, Bell, Timer, Database, Settings as SettingsIcon,
  ChevronRight, ChevronLeft, Sun, Moon, CloudMoon, Sparkles,
  Download, Trash2, Zap, BookOpen, Brain, Info, ExternalLink, Shield,
  Layers, RefreshCw, CheckCircle2
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

type View = 'root' | 'appearance' | 'sound' | 'notifications' | 'time' | 'data' | 'advanced' | 'study-methods' | 'about';

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
    localStorage.setItem('examflow_os_data', JSON.stringify(pendingImportState));
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
    a.download = `echos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const renderRoot = () => (
    <motion.div key="root" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-nano">
      <CategoryRow icon={<Palette size={19} />} title="Appearance" description="Themes, density, accents" onClick={() => setView('appearance')} />
      <CategoryRow icon={<Volume2 size={19} />} title="Sound & Focus" description="Ambient sets, volume, auto-play" onClick={() => setView('sound')} />
      <CategoryRow icon={<Bell size={19} />} title="Notifications" description="Reminders, streaks" onClick={() => setView('notifications')} />
      <CategoryRow icon={<Timer size={19} />} title="Time & Behavior" description="Pomodoro, breaks, Strict Mode" onClick={() => setView('time')} />
      <CategoryRow icon={<Brain size={19} />} title="Study Methods" description="Leitner, Feynman, SQ3R, Blurting" onClick={() => setView('study-methods')} />
      <CategoryRow icon={<Database size={19} />} title="Data" description="Backup, export, restore system" onClick={() => setView('data')} />
      <CategoryRow icon={<SettingsIcon size={19} />} title="Advanced" description="Experimental, system info" onClick={() => setView('advanced')} />
      <CategoryRow icon={<Info size={19} />} title="About EchOS" description="imdvichrn · Echoless · Build info" onClick={() => setView('about')} />
    </motion.div>
  );

  const renderAppearance = () => (
    <motion.div key="appearance" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Appearance" onBack={() => setView('root')} />

      <div className="space-y-small">
        <p className="caption-sm text-tertiary px-2">Live Preview</p>
        <div className={cn("surface-card border border-border-color overflow-hidden p-medium", `density-${activeDensity}`)}>
          <div className="space-y-[var(--space-small)]">
            <div className="flex items-center gap-[var(--space-nano)]">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <h4 className="header-md">Sanctuary Preview</h4>
            </div>
            <p className="body-md text-secondary">Density scales all proportions.</p>
            <button className="primary-button w-full">Action Button</button>
          </div>
        </div>
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Interface Density</p>
        <div className="bg-action-light dark:bg-action-dark p-1 rounded-2xl flex gap-1">
          {(['compact', 'default', 'comfortable'] as const).map(d => (
            <button key={d} onClick={() => updateSettings({ density: d })}
              onMouseEnter={() => setHoverDensity(d)} onMouseLeave={() => setHoverDensity(null)}
              className={cn("flex-1 py-2 rounded-xl body-md font-medium transition-all press-scale",
                settings.density === d ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-secondary hover:text-primary")}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark', 'night', 'auto'] as const).map(t => (
            <motion.button key={t} onClick={() => updateSettings({ theme: t })}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn("surface-card flex items-center gap-3 p-3 border transition-all",
                settings.theme === t ? "border-accent bg-accent/5" : "border-transparent hover:bg-action-light/50 dark:hover:bg-action-dark/50")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center",
                t === 'light' ? "bg-orange-500/10 text-orange-500" :
                t === 'dark'  ? "bg-accent/10 text-accent" :
                t === 'night' ? "bg-indigo-500/10 text-indigo-500" : "bg-success/10 text-success")}>
                {t === 'light' ? <Sun size={15} /> : t === 'dark' ? <Moon size={15} /> : t === 'night' ? <CloudMoon size={15} /> : <Sparkles size={15} />}
              </div>
              <span className="body-md font-medium capitalize">{t}</span>
              {settings.theme === t && <CheckCircle2 size={14} className="ml-auto text-accent" />}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderSound = () => (
    <motion.div key="sound" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Sound & Focus" onBack={() => setView('root')} />

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Ambient Engine</p>
        <div className="grid grid-cols-3 gap-2">
          {(['white', 'rain', 'brown'] as const).map(s => (
            <motion.button key={s} onClick={() => updateSettings({ soundType: s })}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn("body-md font-medium py-3 rounded-xl transition-all border",
                settings.soundType === s ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-action-light dark:bg-action-dark border-transparent text-secondary")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-small px-2">
        <div className="flex justify-between items-center">
          <label className="caption-sm text-tertiary">Master Volume</label>
          <span className="caption-sm font-semibold text-accent">{Math.round(settings.volume * 100)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-action-light dark:bg-action-dark overflow-hidden relative">
          <motion.div initial={false} animate={{ width: `${settings.volume * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, #1D4ED8, #7C3AED)' }} />
          <input type="range" min="0" max="1" step="0.05" value={settings.volume}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              if ((next === 0 || next === 1) && next !== settings.volume) pulse('heavy');
              updateSettings({ volume: next });
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>

      <ToggleRow title="Auto-play Ambient" description="Start soundscape when focus begins" enabled={settings.autoPlay} onToggle={() => updateSettings({ autoPlay: !settings.autoPlay })} />
    </motion.div>
  );

  const renderTime = () => (
    <motion.div key="time" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Time & Behavior" onBack={() => setView('root')} />

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Focus Intervals</p>

        <div className="surface-card space-y-medium">
          <div className="space-y-small">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[15px] font-medium text-primary">Pomodoro Length</p>
                <p className="text-[12px] text-secondary">Active focus session duration</p>
              </div>
              <span className="text-[18px] font-medium tracking-tighter text-accent tabular-nums">{settings.pomodoroLength}m</span>
            </div>
            <input type="range" min="10" max="60" step="5" value={settings.pomodoroLength}
              onChange={(e) => updateSettings({ pomodoroLength: parseInt(e.target.value) })}
              className="w-full accent-accent h-1 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-tertiary">
              <span>10m</span><span>25m</span><span>45m</span><span>60m</span>
            </div>
          </div>

          <div className="h-px bg-border-color" />

          <div className="space-y-small">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[15px] font-medium text-primary">Short Break</p>
                <p className="text-[12px] text-secondary">Rest between sessions</p>
              </div>
              <span className="text-[18px] font-medium tracking-tighter text-accent tabular-nums">{settings.breakLength}m</span>
            </div>
            <input type="range" min="2" max="20" step="1" value={settings.breakLength}
              onChange={(e) => updateSettings({ breakLength: parseInt(e.target.value) })}
              className="w-full accent-accent h-1 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-tertiary">
              <span>2m</span><span>5m</span><span>10m</span><span>20m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Behavioral Logic</p>
        <ToggleRow
          title="Strict Mode"
          description="Locks navigation during active focus — no escape"
          enabled={settings.strictMode}
          onToggle={() => updateSettings({ strictMode: !settings.strictMode })}
        />
        <ToggleRow
          title="Auto-Start Breaks"
          description="Seamless transitions between sessions"
          enabled={true}
          onToggle={() => {}}
        />
      </div>

      {settings.strictMode && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-3 py-3 rounded-xl"
          style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)' }}>
          <Shield size={15} className="text-warning mt-0.5 shrink-0" />
          <p className="text-[12px] text-warning leading-snug">
            Strict Mode active — the nav bar will be locked while your timer is running. Long-press to end the session.
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const renderStudyMethods = () => (
    <motion.div key="study-methods" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Study Methods" onBack={() => setView('root')} />

      <p className="caption-sm text-tertiary px-2" style={{ textTransform: 'none', letterSpacing: '0.01em' }}>
        EchOS supports four research-backed methods. Each note can carry method metadata.
      </p>

      {/* Leitner System */}
      <MethodCard
        icon={<Layers size={18} />}
        color="#4A90E2"
        title="Leitner System"
        tagline="5-Box Spaced Repetition"
        description="Cards move through 5 boxes based on recall success. Box 0 = daily review. Box 4 = mastered. Failed cards reset to Box 0."
        infographic={<LeitnerInfographic />}
        howItWorks={[
          "Add a flashcard to Box 0",
          "If recalled correctly → advance one box",
          "If forgotten → drop back to Box 0",
          "Each box has longer review intervals",
          "Box 4 = Elite / fully mastered",
        ]}
      />

      {/* Feynman Technique */}
      <MethodCard
        icon={<Brain size={18} />}
        color="#34C759"
        title="Feynman Technique"
        tagline="Teach it simply"
        description="Explain a concept as if to a 12-year-old. Gaps in your explanation reveal gaps in your understanding."
        infographic={<FeynmanInfographic />}
        howItWorks={[
          "Choose a concept to master",
          "Explain it in plain, simple language",
          "Identify gaps where you get stuck",
          "Go back to the source material",
          "Simplify your explanation further",
        ]}
      />

      {/* SQ3R */}
      <MethodCard
        icon={<BookOpen size={18} />}
        color="#FF9F0A"
        title="SQ3R"
        tagline="Survey · Question · Read · Recite · Review"
        description="A structured reading strategy that converts passive reading into active learning with built-in self-testing."
        infographic={<SQ3RInfographic />}
        howItWorks={[
          "Survey: skim headings and bold text",
          "Question: turn headings into questions",
          "Read: actively seek answers",
          "Recite: close the book, recall key points",
          "Review: connect ideas across the chapter",
        ]}
      />

      {/* Blurting */}
      <MethodCard
        icon={<Zap size={18} />}
        color="#AF52DE"
        title="Blurting"
        tagline="Maximum recall intensity"
        description="Close all resources and write (or type) everything you know about a topic in one go. Brutal but highly effective for exam prep."
        infographic={<BlurtingInfographic />}
        howItWorks={[
          "Study a topic once",
          "Close all notes and resources",
          "Write everything you remember — fast",
          "Review against source material",
          "Repeat until gaps are gone",
        ]}
      />
    </motion.div>
  );

  const renderData = () => (
    <motion.div key="data" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Data Management" onBack={() => setView('root')} />

      <div className="space-y-nano">
        <CategoryRow icon={<RefreshCw size={19} />} title="Restore System"
          description={importStatus === 'validating' ? 'Validating backup…' : 'Import a verified EchOS backup'}
          onClick={handleSelectBackupFile} />
        <CategoryRow icon={<Download size={19} />} title="Export Backup" description="Download your study system as JSON" onClick={exportData} />
        <CategoryRow icon={<Trash2 size={19} className="text-error" />} title="Reset All" description="Wipe all data and factory reset" onClick={onReset} />
      </div>

      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleBackupFileChange} />

      <AnimatePresence>
        {showImportConfirm && pendingImportState && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="surface-card p-medium border border-border-color rounded-2xl space-y-small">
            <div className="space-y-nano">
              <p className="body-md font-medium text-primary">Verified backup detected</p>
              <p className="caption-sm text-secondary" style={{ textTransform: 'none', letterSpacing: '0' }}>
                Restoring will overwrite your current data with this backup.
              </p>
            </div>
            <div className="flex gap-small">
              <button onClick={() => { setShowImportConfirm(false); setPendingImportState(null); }} className="secondary-button flex-1">Cancel</button>
              <button onClick={handleConfirmImport} className="primary-button flex-1">Apply Restore</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {importError && <p className="caption-sm text-error px-2" style={{ textTransform: 'none' }}>{importError}</p>}
    </motion.div>
  );

  const renderNotifications = () => (
    <motion.div key="notifications" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Notifications" onBack={() => setView('root')} />
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Study Reminders</p>
        <ToggleRow title="Daily Goal Reminder" description="Notify when daily study goal is not met" enabled={true} onToggle={() => {}} />
        <ToggleRow title="Streak Protection" description="Alert 1 hour before streak expires" enabled={true} onToggle={() => {}} />
      </div>
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">System Alerts</p>
        <ToggleRow title="Exam Urgency" description="Show countdown on lock screen" enabled={false} onToggle={() => {}} />
      </div>
    </motion.div>
  );

  const renderAdvanced = () => (
    <motion.div key="advanced" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="Advanced" onBack={() => setView('root')} />
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Experimental</p>
        <ToggleRow title="Haptic Feedback" description="Simulated vibrations on interaction" enabled={true} onToggle={() => {}} />
        <ToggleRow title="GPU Acceleration" description="Force hardware rendering for animations" enabled={true} onToggle={() => {}} />
      </div>
      <div className="surface-card p-medium space-y-small">
        {[
          ['System Version', 'v1.3.0-sanctuary'],
          ['Build ID', 'IMD-ECH-PRIME-01'],
          ['Audio Engine', 'Web Audio API v2'],
          ['Storage', 'IndexedDB + localStorage'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center">
            <span className="body-md text-secondary">{label}</span>
            <span className="body-md font-mono text-primary text-[12px]">{value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderAbout = () => (
    <motion.div key="about" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="space-y-medium">
      <SubpageHeader title="About EchOS" onBack={() => setView('root')} />

      {/* App Identity */}
      <div className="surface-card p-medium space-y-medium">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-bold text-[18px]">EO</div>
          <div>
            <p className="text-[18px] font-medium tracking-tighter text-primary">EchOS</p>
            <p className="text-[12px] text-secondary">Study Sanctuary · Build IMD-ECH-PRIME-01</p>
          </div>
        </div>
        <p className="text-[13px] text-secondary leading-relaxed">
          An offline-first study sanctuary for serious learners. Break down your syllabus into intelligent nodes, study with spaced repetition, and enter the Sanctuary Arena for deep focus.
        </p>
      </div>

      {/* Creator */}
      <div className="surface-card p-medium space-y-medium">
        <p className="caption-sm text-tertiary">Creator</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold text-[14px]">GD</div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-primary">geddada devicharan</p>
            <p className="text-[12px] text-secondary">@imdvichrn</p>
          </div>
          <a href="https://twitter.com/imdvichrn" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent text-[12px] font-medium hover:opacity-80 transition-opacity">
            Follow <ExternalLink size={11} />
          </a>
        </div>

        <div className="h-px bg-border-color" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[14px]">EC</div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-primary">Echoless</p>
            <p className="text-[12px] text-secondary">AI Signals & Design System</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-nano">
        <p className="caption-sm text-tertiary px-2">Connect</p>
        {[
          { label: 'GitHub', sub: 'Source & contributions', href: 'https://github.com/imdvichrn' },
          { label: 'Twitter / X', sub: '@imdvichrn', href: 'https://twitter.com/imdvichrn' },
          { label: 'Support', sub: 'Report a bug or feature request', href: 'mailto:support@echoless.app' },
        ].map(link => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
            className={cn("w-full flex items-center gap-medium px-medium rounded-2xl transition-all group relative", "h-[var(--row-height)] hover:bg-action-light/50 dark:hover:bg-action-dark/50")}>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-medium text-primary">{link.label}</p>
              <p className="text-[12px] text-secondary">{link.sub}</p>
            </div>
            <ExternalLink size={15} className="text-tertiary group-hover:text-secondary" />
            <div className="absolute bottom-0 left-[var(--space-large)] right-0 h-[0.5px] bg-border-color" />
          </a>
        ))}
      </div>

      <p className="text-center text-[11px] text-tertiary pb-4">
        EchOS · imdvichrn · Echoless · IMD-ECH-PRIME-01
      </p>
    </motion.div>
  );

  return (
    <div className="max-w-xl mx-auto py-header">
      <header className="space-y-1 mb-8">
        <h2 className="text-3xl font-medium tracking-tighter text-primary">Settings</h2>
        <p className="text-tertiary text-[13px]">Developed by imdvichrn &amp; Echoless</p>
      </header>

      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {view === 'root'           && renderRoot()}
          {view === 'appearance'     && renderAppearance()}
          {view === 'sound'          && renderSound()}
          {view === 'data'           && renderData()}
          {view === 'notifications'  && renderNotifications()}
          {view === 'time'           && renderTime()}
          {view === 'study-methods'  && renderStudyMethods()}
          {view === 'advanced'       && renderAdvanced()}
          {view === 'about'          && renderAbout()}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function CategoryRow({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn("w-full flex items-center gap-medium px-medium rounded-2xl transition-all press-scale group relative", "h-[var(--row-height)] hover:bg-action-light/50 dark:hover:bg-action-dark/50")}>
      <div className="w-icon h-icon flex items-center justify-center text-secondary group-hover:text-primary transition-colors">{icon}</div>
      <div className="flex-1 text-left space-y-0">
        <p className="text-[15px] font-medium leading-none text-primary">{title}</p>
        <p className="text-[12px] text-secondary leading-tight">{description}</p>
      </div>
      <ChevronRight size={17} className="text-tertiary group-hover:text-secondary transition-colors" />
      <div className="absolute bottom-0 left-[var(--space-large)] right-0 h-[0.5px] bg-border-color" />
    </button>
  );
}

function ToggleRow({ title, description, enabled, onToggle }: { title: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="w-full h-[var(--row-height)] flex items-center gap-medium px-medium rounded-2xl relative">
      <div className="flex-1 text-left">
        <p className="text-[15px] font-medium leading-none text-primary">{title}</p>
        <p className="text-[12px] text-secondary leading-tight">{description}</p>
      </div>
      <motion.button onClick={onToggle}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn("w-12 h-6 rounded-full transition-all relative", enabled ? "bg-accent" : "bg-action-light dark:bg-action-dark")}>
        <motion.div animate={{ x: enabled ? 26 : 2 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
      </motion.button>
      <div className="absolute bottom-0 left-[var(--space-large)] right-0 h-[0.5px] bg-border-color" />
    </div>
  );
}

function SubpageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-small mb-4">
      <motion.button onClick={onBack}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-10 h-10 rounded-full bg-action-light dark:bg-action-dark flex items-center justify-center text-primary">
        <ChevronLeft size={20} />
      </motion.button>
      <h3 className="text-[18px] font-medium tracking-tighter text-primary">{title}</h3>
    </div>
  );
}

/* ── Study Method Cards ── */

interface MethodCardProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  tagline: string;
  description: string;
  infographic: React.ReactNode;
  howItWorks: string[];
}

function MethodCard({ icon, color, title, tagline, description, infographic, howItWorks }: MethodCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      layout
      className="surface-card overflow-hidden cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium tracking-tighter text-primary">{title}</p>
          <p className="text-[11px] font-medium" style={{ color }}>{tagline}</p>
          <p className="text-[12px] text-secondary mt-1 leading-snug">{description}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="text-tertiary/50 mt-1 shrink-0">
          <ChevronRight size={16} />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }} className="overflow-hidden">
            <div className="mt-medium pt-medium border-t border-border-color space-y-medium">
              <div className="flex justify-center">{infographic}</div>
              <div className="space-y-small">
                <p className="caption-sm text-tertiary px-1">How it Works</p>
                {howItWorks.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                      style={{ background: color }}>
                      {i + 1}
                    </span>
                    <p className="text-[13px] text-secondary leading-snug">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Method Infographics ── */

function LeitnerInfographic() {
  const boxes = ['1', '2', '3', '4', '5'];
  const colors = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#4A90E2'];
  return (
    <div className="flex items-end gap-1.5">
      {boxes.map((b, i) => (
        <div key={b} className="flex flex-col items-center gap-1">
          <div className="w-10 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
            style={{ height: 16 + i * 8, background: colors[i] }}>
            {b}
          </div>
          <span className="text-[8px] text-tertiary">{['1d','2d','4d','8d','∞'][i]}</span>
        </div>
      ))}
    </div>
  );
}

function FeynmanInfographic() {
  const steps = ['Study', 'Teach', 'Gap?', 'Review', 'Refine'];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="px-2 py-1 rounded-lg text-[10px] font-medium text-white"
            style={{ background: `hsl(${120 + i * 30},60%,45%)` }}>{s}</div>
          {i < steps.length - 1 && <span className="text-tertiary text-[10px]">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function SQ3RInfographic() {
  const steps = [
    { letter: 'S', label: 'Survey', color: '#FF9F0A' },
    { letter: 'Q', label: 'Question', color: '#FF6B35' },
    { letter: 'R', label: 'Read', color: '#4A90E2' },
    { letter: 'R', label: 'Recite', color: '#34C759' },
    { letter: 'R', label: 'Review', color: '#AF52DE' },
  ];
  return (
    <div className="flex gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[14px]"
            style={{ background: s.color }}>{s.letter}</div>
          <span className="text-[8px] text-tertiary text-center leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function BlurtingInfographic() {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex gap-3">
        <div className="px-4 py-2 rounded-xl text-white text-[12px] font-medium" style={{ background: '#AF52DE' }}>
          Close notes
        </div>
        <div className="px-4 py-2 rounded-xl border border-border-color text-[12px] font-medium text-primary">
          Brain dump ✍️
        </div>
        <div className="px-4 py-2 rounded-xl text-white text-[12px] font-medium" style={{ background: '#34C759' }}>
          Compare
        </div>
      </div>
      <p className="text-[10px] text-tertiary">Repeat until no gaps remain</p>
    </div>
  );
}
