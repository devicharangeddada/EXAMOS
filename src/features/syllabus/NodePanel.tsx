import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { Play, Zap, Plus, CheckCircle2, X } from 'lucide-react';
import { StudyNode } from '../../types';
import { cn } from '../../lib/utils';

interface NodePanelProps {
  node: StudyNode;
  onAddNote: (text: string, details?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onStartFocus: () => void;
  onRecall: () => void;
  onAddAttachment: (file: File) => void;
  onDeleteAttachment: (id: string) => void;
}

export default function NodePanel({ node, onAddNote, onDeleteNote, onStartFocus, onRecall, onAddAttachment, onDeleteAttachment }: NodePanelProps) {
  const [noteText, setNoteText] = useState('');
  const [noteDetails, setNoteDetails] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const noteReady = noteText.trim().length > 0;

  const handleSubmitNote = async (event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!noteReady || isSaving) return;
    setIsSaving(true);
    onAddNote(noteText.trim(), noteDetails.trim() || undefined);
    setNoteText('');
    setNoteDetails('');
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsSaving(false);
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 1500);
  };

  return (
    <div
      className="surface-card space-y-medium"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="space-y-nano">
        <p className="text-[18px] font-medium tracking-tighter text-primary leading-tight">{node.title}</p>
        <div className="flex gap-small">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={onStartFocus}
            className="flex-1 flex min-h-[44px] items-center justify-center gap-small primary-button !rounded-[12px] text-[13px]"
            type="button"
          >
            <Play size={16} fill="currentColor" /> Focus
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={onRecall}
            className="flex-1 flex min-h-[44px] items-center justify-center gap-small secondary-button !rounded-[12px] text-[13px]"
            type="button"
          >
            <Zap size={16} /> Recall
          </motion.button>
        </div>
      </div>

      <div className="space-y-small">
        <p className="caption-sm text-tertiary">Notes</p>
        <div className="space-y-nano max-h-48 overflow-y-auto pr-1">
          {node.notes.length === 0 && (
            <p className="text-[12px] text-tertiary italic">No notes yet.</p>
          )}
          {node.notes.map((note) => (
            <div key={note.id} className="group flex items-start gap-nano bg-action-light dark:bg-action-dark rounded-lg px-small py-nano">
              <p className="flex-1 text-[12px] text-primary">{note.text}</p>
              <button
                onClick={() => onDeleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-tertiary hover:text-error"
                aria-label="Delete note"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        <form className="space-y-nano" onSubmit={handleSubmitNote}>
          <input
            className="w-full bg-action-light dark:bg-action-dark rounded-lg px-small py-nano text-[12px] text-primary border border-border-color outline-none focus:border-accent/50 transition-colors"
            placeholder="Note title"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmitNote(e);
              }
            }}
            aria-label="Note title"
          />
          <input
            className="w-full bg-action-light dark:bg-action-dark rounded-lg px-small py-nano text-[11px] text-secondary border border-border-color outline-none focus:border-accent/50 transition-colors"
            placeholder="Note description"
            value={noteDetails}
            onChange={(e) => setNoteDetails(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmitNote(e);
              }
            }}
            aria-label="Note details"
          />
          <button
            type="submit"
            disabled={!noteReady || isSaving}
            className={cn(
              "w-full mt-small inline-flex items-center justify-center gap-small rounded-[12px] bg-accent text-white px-medium text-[13px] font-medium transition-all min-h-[44px]",
              noteReady && !isSaving
                ? 'hover:brightness-110 shadow-[0_4px_14px_0_rgba(94,92,230,0.39)]'
                : 'opacity-50 grayscale cursor-not-allowed'
            )}
          >
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Note'}
            {saveSuccess ? <CheckCircle2 size={16} /> : <Plus size={16} />}
          </button>
        </form>
      </div>

      <div className="space-y-nano">
        <div className="flex items-center justify-between">
          <p className="caption-sm text-tertiary">Files</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-accent hover:opacity-80 flex items-center gap-nano"
            type="button"
          >
            <Plus size={11} /> Attach
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddAttachment(file);
              e.currentTarget.value = '';
            }}
          />
        </div>
        {(node.attachments || []).map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-nano bg-action-light dark:bg-action-dark rounded-lg px-small py-nano">
            <span className="flex-1 text-[11px] text-primary truncate">{attachment.name}</span>
            <button
              onClick={() => onDeleteAttachment(attachment.id)}
              className="text-tertiary hover:text-error"
              aria-label="Delete attachment"
              type="button"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-nano pt-nano border-t border-border-color">
        <p className="caption-sm text-tertiary">Study Methods</p>
        <div className="flex gap-nano flex-wrap">
          {['Leitner', 'Feynman', 'SQ3R'].map((method) => (
            <span key={method} className="text-[10px] px-[8px] py-[3px] rounded-full border border-border-color text-secondary font-medium">{method}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
