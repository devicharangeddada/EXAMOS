import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, BookOpen, Clock, ChevronRight, CheckCircle2, Target } from 'lucide-react';
import { OnboardingData, StudyNode } from '../types';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: (data: OnboardingData, nodes: Record<string, StudyNode>) => void;
}

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
      const id = `subject-${index}`;
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
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-large"
          >
            <div className="space-y-nano">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-small">
                <Target size={24} />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-primary">Define Your Target</h2>
              <p className="text-secondary">What are we preparing for?</p>
            </div>

            <div className="space-y-medium">
              <div className="space-y-nano">
                <label className="text-[11px] uppercase tracking-wider font-bold text-tertiary">Exam Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Power Systems Exam, Core Cert, Final Review"
                  value={data.examName}
                  onChange={e => setData(prev => ({ ...prev, examName: e.target.value }))}
                  className="w-full h-14 bg-action-light/30 dark:bg-action-dark/30 border border-border-color rounded-2xl px-medium focus:border-accent transition-colors outline-none text-primary"
                />
              </div>
              <div className="space-y-nano">
                <label className="text-[11px] uppercase tracking-wider font-bold text-tertiary">Exam Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                  <input 
                    type="date" 
                    value={data.examDate}
                    onChange={e => setData(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full h-14 bg-action-light/30 dark:bg-action-dark/30 border border-border-color rounded-2xl pl-12 pr-medium focus:border-accent transition-colors outline-none text-primary"
                  />
                </div>
              </div>
            </div>

            <button 
              disabled={!data.examName || !data.examDate}
              onClick={nextStep}
              className="w-full h-14 bg-accent text-white rounded-2xl font-medium flex items-center justify-center gap-small disabled:opacity-50 disabled:grayscale transition-all press-scale"
            >
              Continue <ChevronRight size={18} />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-large"
          >
            <div className="space-y-nano">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-small">
                <BookOpen size={24} />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-primary">Subject Breakdown</h2>
              <p className="text-secondary">List the core subjects or modules.</p>
            </div>

            <div className="space-y-medium">
              <div className="flex gap-small">
                <input 
                  type="text" 
                  placeholder="Add a subject..."
                  value={subjectInput}
                  onChange={e => setSubjectInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubject()}
                  className="flex-1 h-14 bg-action-light/30 dark:bg-action-dark/30 border border-border-color rounded-2xl px-medium focus:border-accent transition-colors outline-none text-primary"
                />
                <button 
                  onClick={addSubject}
                  className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center hover:bg-accent/20 transition-colors"
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>

              <div className="flex flex-wrap gap-small">
                <AnimatePresence>
                  {data.subjects.map(s => (
                    <motion.button
                      key={s}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => removeSubject(s)}
                      className="px-medium h-10 bg-action-light/50 dark:bg-action-dark/50 border border-border-color rounded-xl text-xs font-medium text-secondary hover:border-error hover:text-error transition-all flex items-center gap-2"
                    >
                      {s} <span>×</span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex gap-small">
              <button 
                onClick={prevStep}
                className="flex-1 h-14 bg-action-light/30 dark:bg-action-dark/30 text-secondary rounded-2xl font-medium"
              >
                Back
              </button>
              <button 
                disabled={data.subjects.length === 0}
                onClick={nextStep}
                className="flex-1 h-14 bg-accent text-white rounded-2xl font-medium flex items-center justify-center gap-small disabled:opacity-50 transition-all press-scale"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-large"
          >
            <div className="space-y-nano">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-small">
                <Clock size={24} />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-primary">Daily Availability</h2>
              <p className="text-secondary">How many hours can you commit daily?</p>
            </div>

            <div className="space-y-large">
              <div className="flex flex-col items-center gap-small">
                <span className="text-[48px] font-medium text-accent tabular-nums">{data.dailyAvailability}h</span>
                <input 
                  type="range" 
                  min="1" 
                  max="12" 
                  step="0.5"
                  value={data.dailyAvailability}
                  onChange={e => setData(prev => ({ ...prev, dailyAvailability: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-action-light/30 dark:bg-action-dark/30 rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between w-full text-[10px] uppercase tracking-widest font-bold text-tertiary">
                  <span>1 Hour</span>
                  <span>12 Hours</span>
                </div>
              </div>

              <div className="surface-card p-medium border border-border-color bg-accent/5">
                <p className="text-xs text-secondary leading-relaxed">
                  Based on your exam date, we'll distribute your subjects to ensure you're ready by <span className="text-accent font-medium">{new Date(data.examDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-small">
              <button 
                onClick={prevStep}
                className="flex-1 h-14 bg-action-light/30 dark:bg-action-dark/30 text-secondary rounded-2xl font-medium"
              >
                Back
              </button>
              <button 
                onClick={generateSyllabus}
                className="flex-1 h-14 bg-accent text-white rounded-2xl font-medium flex items-center justify-center gap-small transition-all press-scale shadow-lg shadow-accent/20"
              >
                Generate Syllabus
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-base-light dark:bg-base-dark flex items-center justify-center p-medium">
      <div className="max-w-md w-full">
        <div className="flex gap-nano mb-large">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                step >= i ? "bg-accent" : "bg-action-light/30 dark:bg-action-dark/30"
              )} 
            />
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
