import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useGesture } from '@use-gesture/react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { cn } from '../lib/utils';

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MediaOverlayProps {
  file: { id: string; name: string; type: string };
  onClose: () => void;
  layoutId?: string;
}

export default function MediaOverlay({ file, onClose, layoutId }: MediaOverlayProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolling, setIsScrolling] = useState(false);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Motion values for swipe-to-exit
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const scale = useTransform(y, [0, 300], [1, 0.8]);

  useEffect(() => {
    const loadUrl = async () => {
      const { getFileUrl } = await import('../lib/storage');
      const fileUrl = await getFileUrl(file.id);
      setUrl(fileUrl);
    };
    loadUrl();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    // Auto-hide HUD
    resetHudTimeout();

    return () => {
      if (url) URL.revokeObjectURL(url);
      window.removeEventListener('keydown', handleEsc);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [file.id, onClose]);

  const resetHudTimeout = () => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setIsHudVisible(true);
    hudTimeoutRef.current = setTimeout(() => {
      setIsHudVisible(false);
    }, 2000);
  };

  const handleInteraction = () => {
    resetHudTimeout();
  };

  const handleDoubleTap = () => {
    setZoom(prev => (prev > 1 ? 1 : 2));
    resetHudTimeout();
  };

  const bind = useGesture({
    onPinch: ({ offset: [d] }) => {
      // Rubber-band resistance: limit zoom between 0.5 and 5
      const nextZoom = Math.max(0.5, Math.min(5, 1 + d / 100));
      setZoom(nextZoom);
      resetHudTimeout();
    },
    onDrag: ({ offset: [, dy], memo = y.get() }) => {
      if (zoom === 1) {
        y.set(memo + dy);
        if (dy > 200) onClose();
      }
      return memo;
    },
    onDragEnd: () => {
      if (y.get() < 200) {
        y.set(0);
      }
    },
    onScroll: ({ target }) => {
      if (!target) return;
      const { scrollTop, scrollHeight, clientHeight } = target as HTMLElement;
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 1000);
      
      if (numPages) {
        const pageHeight = scrollHeight / numPages;
        const newPage = Math.floor(scrollTop / pageHeight) + 1;
        if (newPage !== currentPage) setCurrentPage(newPage);
      }
      resetHudTimeout();
    }
  }, {
    drag: { filterTaps: true, axis: 'y' }
  });

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const isPdf = file.type === 'application/pdf';

  const transition = {
    duration: 0.6,
    ease: [0.2, 0.8, 0.2, 1]
  };

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000] overflow-hidden"
      style={{ opacity }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Ghost HUD */}
      <AnimatePresence>
        {isHudVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 right-0 z-[110] p-large flex items-center justify-between pointer-events-none"
          >
            <div className="flex flex-col">
              <span className="text-[12px] text-white/60 font-medium tracking-tight">{file.name}</span>
              {isPdf && numPages && (
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-nano">
                  {numPages} Pages
                </span>
              )}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="pointer-events-auto p-small bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors border border-white/5"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Indicator (PDF Only) */}
      <AnimatePresence>
        {isPdf && isScrolling && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-large left-1/2 -translate-x-1/2 z-[110] px-medium py-nano bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white text-[11px] font-bold shadow-2xl"
          >
            {currentPage} / {numPages}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Canvas */}
      <motion.div 
        layoutId={layoutId}
        style={{ y, scale, zoom: zoom }}
        transition={transition}
        className={cn(
          "w-full h-full flex items-center justify-center",
          isPdf ? "overflow-y-auto custom-scrollbar-minimal" : "cursor-zoom-in"
        )}
        {...bind()}
        onClick={(e) => {
          if (e.detail === 1) handleInteraction();
          if (e.detail === 2) handleDoubleTap();
        }}
      >
        {url ? (
          isPdf ? (
            <div className="w-full max-w-3xl py-xlarge flex flex-col items-center gap-medium select-none pointer-events-none">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center gap-medium text-white/40">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    <span className="caption-sm font-bold uppercase tracking-widest">Rendering...</span>
                  </div>
                }
              >
                {Array.from(new Array(numPages), (_, index) => {
                  const pageNumber = index + 1;
                  // Simple lazy rendering: only render if within 2 pages of current
                  const isNear = Math.abs(pageNumber - currentPage) <= 2;
                  
                  return (
                    <div key={`page_${pageNumber}`} className="shadow-2xl mb-large min-h-[500px] bg-white/5 rounded-sm overflow-hidden">
                      {isNear ? (
                        <Page 
                          pageNumber={pageNumber} 
                          width={Math.min(window.innerWidth * 0.9, 800)}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          loading={<div className="w-full h-[800px] bg-white/5 animate-pulse" />}
                        />
                      ) : (
                        <div className="w-full h-[800px] flex items-center justify-center text-white/5 font-bold text-4xl">
                          {pageNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Document>
            </div>
          ) : (
            <motion.img 
              initial={{ filter: 'blur(20px)', scale: 1.1 }}
              animate={{ filter: 'blur(0px)', scale: 1 }}
              transition={{ duration: 0.4 }}
              src={url} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300"
              draggable={false}
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-medium text-white/40">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span className="caption-sm font-bold uppercase tracking-widest">Loading Asset...</span>
          </div>
        )}
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-minimal::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar-minimal::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-minimal::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar-minimal::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </motion.div>
  );
}
