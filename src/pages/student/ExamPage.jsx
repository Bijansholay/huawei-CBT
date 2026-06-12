import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam } from '../../context/ExamContext';
import { Clock, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logExamViolation } from '../../services/api';

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.slice(0, 4).map((option, index) => {
      const label = String(option?.label || String.fromCharCode(65 + index)).toUpperCase();
      const text = typeof option === 'string'
        ? option
        : String(option?.text || option?.value || option?.optionText || option?.label || '');
      return { label, text };
    }).filter((option) => option.text !== '');
  }

  if (options && typeof options === 'object') {
    return Object.entries(options).map(([label, text]) => ({
      label: String(label).toUpperCase(),
      text: String(text)
    }));
  }

  return [];
}

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentExam,
    currentQuestions,
    startExam,
    saveAnswer,
    answers,
    submitExam,
    submitExamNow,
    isExamLoading
  } = useExam();

  const examShellRef = useRef(null);
  const violationCooldownRef = useRef(0);
  const violationCountRef = useRef(0);
  const violationTimerRef = useRef(null);
  const violationBannerTimerRef = useRef(null);
  const processingViolationRef = useRef(false);
  const submitInProgressRef = useRef(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationModal, setViolationModal] = useState({ open: false, message: '' });
  const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flags, setFlags] = useState(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQ = currentQuestions[currentQIndex];
  const currentOptions = useMemo(() => normalizeOptions(currentQ?.options), [currentQ]);
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getFullscreenElement = () => {
    return document.fullscreenElement
      || document.webkitFullscreenElement
      || document.msFullscreenElement
      || null;
  };

  const requestFullscreenMode = useCallback(async () => {
    const target = examShellRef.current || document.documentElement;
    const request = target.requestFullscreen
      || target.webkitRequestFullscreen
      || target.msRequestFullscreen;

    if (!request) {
      setFullscreenPrompt(true);
      return false;
    }

    try {
      await Promise.resolve(request.call(target));
      setFullscreenPrompt(false);
      return true;
    } catch {
      setFullscreenPrompt(true);
      return false;
    }
  }, []);

  const sendViolationTelemetry = useCallback(async (payload) => {
    try {
      await logExamViolation(id, payload);
    } catch (err) {
      console.error('Failed to log exam violation', err);
    }
  }, [id]);

  const queueViolationTelemetry = useCallback((payload, immediate = false) => {
    if (violationTimerRef.current) {
      clearTimeout(violationTimerRef.current);
      violationTimerRef.current = null;
    }

    if (immediate) {
      void sendViolationTelemetry(payload);
      return;
    }

    violationTimerRef.current = window.setTimeout(() => {
      violationTimerRef.current = null;
      void sendViolationTelemetry(payload);
    }, 120);
  }, [sendViolationTelemetry]);

  const handleFinalSubmit = useCallback(async () => {
    if (submitInProgressRef.current) return;
    submitInProgressRef.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      await Promise.resolve((submitExamNow || submitExam)(id));
      navigate(`/student/result/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to submit exam');
      setShowSubmitModal(false);
    } finally {
      submitInProgressRef.current = false;
      setIsSubmitting(false);
    }
  }, [id, navigate, submitExam, submitExamNow]);

  const handleViolation = useCallback(async (eventType) => {
    if (!currentExam || processingViolationRef.current) return;

    const now = Date.now();
    if (now - violationCooldownRef.current < 800) {
      return;
    }

    processingViolationRef.current = true;
    violationCooldownRef.current = now;

    try {
      const nextStrike = Math.min(3, violationCountRef.current + 1);
      violationCountRef.current = nextStrike;
      setViolationCount(nextStrike);

      const payload = {
        eventType,
        strikeCount: nextStrike,
        occurredAt: new Date(now).toISOString(),
        highResolutionTimestamp: typeof performance !== 'undefined' ? performance.now() : null,
        fullscreenActive: Boolean(getFullscreenElement()),
        visibilityState: document.visibilityState
      };

      queueViolationTelemetry(payload, nextStrike >= 3);

      if (nextStrike >= 3) {
        setViolationModal({
          open: true,
          message: 'Third violation detected. Your session is being submitted immediately.'
        });
        await handleFinalSubmit();
        return;
      }

      setViolationModal({
        open: true,
        message: `Violation ${nextStrike} of 3 detected. Fullscreen has been restored.`
      });
      if (violationBannerTimerRef.current) {
        clearTimeout(violationBannerTimerRef.current);
      }
      violationBannerTimerRef.current = window.setTimeout(() => {
        setViolationModal({ open: false, message: '' });
        violationBannerTimerRef.current = null;
      }, 2500);
      await requestFullscreenMode();
    } catch (err) {
      setError(err.message || 'Failed to handle exam violation');
    } finally {
      processingViolationRef.current = false;
    }
  }, [currentExam, handleFinalSubmit, queueViolationTelemetry, requestFullscreenMode]);

  useEffect(() => {
    let active = true;
    startExam(id)
      .then((data) => {
        if (!active) return;
        const minutes = Number(data?.exam?.durationMinutes || data?.exam?.duration_minutes || 0);
        violationCountRef.current = 0;
        setViolationCount(0);
        setViolationModal({ open: false, message: '' });
        setTimeLeft(minutes > 0 ? minutes * 60 : 0);
        setFullscreenPrompt(true);
        void requestFullscreenMode();
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load exam');
      });

    return () => {
      active = false;
    };
  }, [id, requestFullscreenMode, startExam]);

  useEffect(() => {
    if (!currentExam) return undefined;

    const handleVisibilityChange = (event) => {
      event?.preventDefault?.();
      if (document.hidden) {
        void handleViolation('visibilitychange');
      }
    };

    const handleWindowBlur = (event) => {
      event?.preventDefault?.();
      if (!document.hidden) {
        void handleViolation('blur');
      }
    };

    const handleFullscreenChange = (event) => {
      event?.preventDefault?.();
      if (!getFullscreenElement()) {
        void handleViolation('fullscreenchange');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (violationTimerRef.current) {
        clearTimeout(violationTimerRef.current);
        violationTimerRef.current = null;
      }
      if (violationBannerTimerRef.current) {
        clearTimeout(violationBannerTimerRef.current);
        violationBannerTimerRef.current = null;
      }
    };
  }, [currentExam, handleViolation]);

  const handleAnswerChange = (val) => {
    if (!currentQ) return;
    saveAnswer(currentQ.id, val);
  };

  const toggleFlag = () => {
    if (!currentQ) return;
    const newFlags = new Set(flags);
    if (newFlags.has(currentQ.id)) newFlags.delete(currentQ.id);
    else newFlags.add(currentQ.id);
    setFlags(newFlags);
  };

  useEffect(() => {
    if (!timeLeft) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleFinalSubmit, timeLeft]);

  if (isExamLoading && !currentExam) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading exam...</div>;
  }

  if (error && !currentExam) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-red-600">{error}</div>;
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="soft-card p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">No questions available</h1>
          <p className="text-sm text-gray-500 mb-4">This exam does not have any questions yet.</p>
          <button onClick={() => navigate('/student')} className="pill-button bg-gray-900 text-white">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-transparent relative overflow-hidden">
      <header className="px-4 py-2.5 flex justify-between items-center z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700" onClick={() => navigate('/student')}>
            <ChevronLeft size={16} />
          </button>
          <div className="font-semibold text-gray-900 text-sm">{currentExam?.title || 'Exam'}</div>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold ${
          timeLeft < 300 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-700'
        }`}>
          <Clock size={14} />
          {formatTime(timeLeft)}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider border border-amber-100">
            Strikes {violationCount}/3
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden z-10">
        <aside className="w-64 bg-white/60 backdrop-blur-md border-r border-gray-100 p-4 flex flex-col hidden lg:flex flex-shrink-0">
          <div className="mb-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Questions</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {currentQuestions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flags.has(q.id);
                const isCurrent = currentQIndex === i;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(i)}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all relative ${
                      isCurrent ? 'ring-2 ring-brand-500 ring-offset-1 z-10' : 'hover:scale-105'
                    } ${
                      isAnswered
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Progress</span>
              <span className="font-bold text-brand-600">{answeredCount}/{currentQuestions.length}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${currentQuestions.length ? (answeredCount / currentQuestions.length) * 100 : 0}%` }}></div>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl font-bold text-white text-xs bg-gray-900 hover:bg-black transition-colors shadow-sm"
            >
              Submit Assessment
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-soft border border-white p-5 lg:p-8"
            >
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <span className="px-3 py-1 bg-gray-50 rounded-full text-xs font-semibold text-gray-500 border border-gray-100">
                  Question {currentQIndex + 1}
                </span>

                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                    flags.has(currentQ.id)
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Flag size={12} className={flags.has(currentQ.id) ? 'fill-amber-500' : ''} />
                  {flags.has(currentQ.id) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-base md:text-lg font-medium text-gray-900 mb-6 leading-relaxed">
                  {currentQ.question || currentQ.question_text}
                </h2>

                <div className="space-y-2.5">
                  {currentOptions.map((opt, i) => {
                    const isChecked = answers[currentQ.id] === opt.label;

                    return (
                      <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-brand-400 bg-brand-50/50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'
                      }`}>
                        <div className={`w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'border-brand-500' : 'border-gray-300'
                        }`}>
                          {isChecked && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                        </div>
                        <input type="radio" className="hidden" checked={isChecked} onChange={() => handleAnswerChange(opt.label)} />
                        <span className="text-gray-800 text-sm font-medium leading-snug">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 flex-shrink-0">
                <button
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="flex items-center px-4 py-2.5 rounded-full font-semibold text-xs text-gray-600 bg-white border border-gray-100 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={14} className="mr-1" /> Prev
                </button>

                {currentQIndex === currentQuestions.length - 1 ? (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 rounded-full font-bold text-xs text-white bg-gray-900 hover:bg-black shadow-sm transition-colors lg:hidden"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex((prev) => Math.min(currentQuestions.length - 1, prev + 1))}
                    className="flex items-center px-6 py-2.5 rounded-full font-bold text-xs text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-colors"
                  >
                    Next <ChevronRight size={14} className="ml-1" />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {fullscreenPrompt && currentExam && (
          <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fullscreen required</h3>
              <p className="text-sm text-gray-500 mb-5">
                Enter fullscreen to continue the exam. If you leave fullscreen, it will be treated as a violation.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={requestFullscreenMode}
                  className="pill-button bg-gray-900 text-white"
                >
                  Enter fullscreen
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {violationModal.open && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center p-4">
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="mt-4 pointer-events-auto bg-gray-900 text-white rounded-2xl shadow-xl px-5 py-4 max-w-md w-full border border-gray-800"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                Anti-malpractice warning
              </div>
              <div className="text-sm text-gray-100">{violationModal.message}</div>
              <div className="mt-2 text-[11px] text-gray-400">
                Strike {violationCount}/3
              </div>
            </motion.div>
          </div>
        )}

        {showSubmitModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm overflow-hidden p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit exam?</h3>
              <p className="text-sm text-gray-500 mb-5">You can no longer change your answers after submission.</p>
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSubmitModal(false)} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="pill-button bg-gray-900 text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
