import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, BookOpen, Clock, ChevronRight, Target, Plus, X } from 'lucide-react';
import { OnboardingData, StudyNode } from '../types';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: (data: OnboardingData, nodes: Record<string, StudyNode>) => void;
}

const slideVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, scale: 0.98, y: -10, transition: { duration: 0.2 } }
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    examName: '',
    examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subjects: [],
    dailyAvailability: 4,
    completed: false,
  });
  const [subjectInput, setSubjectInput] = useState('');

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const addSubject = () => {
    if (subjectInput.trim() && !data.subjects.includes(subjectInput.trim())) {
      setData(prev => ({ ...prev, subjects: [...prev.subjects, subjectInput.trim()] }));
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setData(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== subject) }));
  };

  const generateSyllabus = () => {
    const nodes: Record<string, StudyNode> = {};
    data.subjects.forEach((subject, index) => {
      const id = crypto.randomUUID();
      nodes[id] = {
        id,
        title: subject,
        parentId: null,
        status: 'not-started',
        notes: [],
        order: index,
        weight: 1,
        focusDifficulty: 2,
        failCount: 0,
        isPriority: false,
        completion: 0,
        lastInteraction: new Date().toISOString(),
        attachments: []
      };
    });
    onComplete({ ...data, completed: true }, nodes);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-large">
            <div className="space-y-small">
              <div className="w-12 h-12 rounded-[14px] bg-accent/10 flex items-center justify-center text-accent">
                <Target size={24} />
              </div>
              <div>
                <h2 className="title-lg">Define Your Target</h2>
                <p className="body-md text-secondary mt-1">What are we preparing for?</p>
              </div>
            </div>

            <div className="space-y-medium">
              <div className="space-y-small">
                <label className="caption-sm pl-1">Exam Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Power Systems, Core Cert"
                  value={data.examName}
                  autoFocus
                  onChange={e => setData(prev => ({ ...prev, examName: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && data.examName) nextStep(); }}
                  className="w-full h-[52px] bg-[var(--action-bg)] border border-[var(--border-color)] rounded-xl px-4 body-md text-primary outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>
              <div className="space-y-small">
                <label className="caption-sm pl-1">Target Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" size={18} />
                  <input 
                    type="date" 
                    value={data.examDate}
                    onChange={e => setData(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full h-[52px] bg-[var(--action-bg)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 body-md text-primary outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all cursor-text"
                  />
                </div>
              </div>
            </div>

            <button 
              disabled={!data.examName || !data.examDate}
              onClick={nextStep}
              className="primary-button w-full disabled:opacity-50 disabled:grayscale transition-all"
            >
              Continue <ChevronRight size={18} />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-large">
            <div className="space-y-small">
              <div className="w-12 h-12 rounded-[14px] bg-accent/10 flex items-center justify-center text-accent">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="title-lg">Syllabus Breakdown</h2>
                <p className="body-md text-secondary mt-1">List the core subjects or modules.</p>
              </div>
            </div>

            <div className="space-y-medium min-h-[140px]">
              <form className="relative flex items-center" onSubmit={(e) => { e.preventDefault(); addSubject(); }}>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Add a subject (e.g., Mathematics)"
                  value={subjectInput}
                  onChange={e => setSubjectInput(e.target.value)}
                  className="w-full h-[52px] bg-[var(--action-bg)] border border-[var(--border-color)] rounded-xl pl-4 pr-14 body-md text-primary outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
                <button 
                  type="submit"
                  disabled={!subjectInput.trim()}
                  className="absolute right-2 w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40 disabled:bg-[var(--border-color)] disabled:text-tertiary transition-all active:scale-95"
                >
                  <Plus size={18} />
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {data.subjects.map(s => (
                    <motion.div
                      key={s}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="h-9 pl-3 pr-1 bg-[var(--action-bg)] border border-[var(--border-color)] rounded-lg flex items-center gap-2"
                    >
                      <span className="body-md text-[13px] text-primary">{s}</span>
                      <button 
                        onClick={() => removeSubject(s)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-tertiary hover:bg-error/10 hover:text-error transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex gap-small">
              <button onClick={prevStep} className="secondary-button flex-1">Back</button>
              <button 
                disabled={data.subjects.length === 0}
                onClick={nextStep}
                className="primary-button flex-1 disabled:opacity-50 disabled:grayscale transition-all"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="step3" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-large">
            <div className="space-y-small">
              <div className="w-12 h-12 rounded-[14px] bg-accent/10 flex items-center justify-center text-accent">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="title-lg">Daily Availability</h2>
                <p className="body-md text-secondary mt-1">How many hours can you commit daily?</p>
              </div>
            </div>

            <div className="space-y-large">
              <div className="flex flex-col items-center gap-medium py-medium">
                <span className="text-[54px] font-light tracking-tight text-primary tabular-nums leading-none">
                  {data.dailyAvailability}<span className="text-[20px] text-tertiary ml-1 font-medium">h</span>
                </span>
                
                <div className="w-full space-y-3">
                  <input 
                    type="range" 
                    min="1" max="12" step="0.5"
                    value={data.dailyAvailability}
                    onChange={e => setData(prev => ({ ...prev, dailyAvailability: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-[var(--action-bg)] rounded-full appearance-none cursor-pointer accent-accent outline-none"
                  />
                  <div className="flex justify-between w-full caption-sm text-tertiary">
                    <span>1 Hour</span>
                    <span>12 Hours</span>
                  </div>
                </div>
              </div>

              <div className="surface-card p-medium bg-accent/5 border-accent/20">
                <p className="body-md text-[13px] text-secondary leading-relaxed">
                  Based on your target, we'll configure your intervals to ensure you're ready by <span className="text-accent font-medium">{new Date(data.examDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-small">
              <button onClick={prevStep} className="secondary-button flex-1">Back</button>
              <button onClick={generateSyllabus} className="primary-button flex-1">
                Enter Sanctuary
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--surface-bg)] flex items-center justify-center p-medium">
      <div className="max-w-md w-full">
        <div className="flex gap-2 mb-8 px-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "h-[3px] flex-1 rounded-full transition-all duration-500 ease-out",
                step >= i ? "bg-accent" : "bg-[var(--border-color)]"
              )} 
            />
          ))}
        </div>
        
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
