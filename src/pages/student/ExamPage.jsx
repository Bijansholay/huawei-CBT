import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam } from '../../context/ExamContext';
import { Clock, Flag, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_QUESTIONS = [
  { id: 'q1', type: 'mcq-single', text: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'] },
  { id: 'q2', type: 'mcq-multiple', text: 'Which of these are programming languages?', options: ['HTML', 'Python', 'Java', 'Banana'] },
  { id: 'q3', type: 'true-false', text: 'React is a library for building user interfaces.' },
  { id: 'q4', type: 'mcq-single', text: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Colorful Style Sheets', 'Creative Style Sheets', 'Computer Style Sheets'] },
  { id: 'q5', type: 'true-false', text: 'JavaScript is a compiled language.' },
];

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startExam, saveAnswer, answers, submitExam } = useExam();
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600); 
  const [flags, setFlags] = useState(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const currentQ = MOCK_QUESTIONS[currentQIndex];
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    startExam(id);
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
  }, [id]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (val) => {
    saveAnswer(currentQ.id, val);
  };

  const toggleFlag = () => {
    const newFlags = new Set(flags);
    if (newFlags.has(currentQ.id)) newFlags.delete(currentQ.id);
    else newFlags.add(currentQ.id);
    setFlags(newFlags);
  };

  const handleFinalSubmit = () => {
    submitExam();
    navigate(`/student/result/${id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-transparent relative overflow-hidden">
      {/* Header */}
      <header className="px-4 py-2.5 flex justify-between items-center z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700" onClick={() => navigate('/student')}>
            <ChevronLeft size={16} />
          </button>
          <div className="font-semibold text-gray-900 text-sm">CS 101</div>
        </div>
        
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold ${
          timeLeft < 300 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-700'
        }`}>
          <Clock size={14} />
          {formatTime(timeLeft)}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden z-10">
        {/* Sidebar - Desktop Layout */}
        <aside className="w-64 bg-white/60 backdrop-blur-md border-r border-gray-100 p-4 flex flex-col hidden lg:flex flex-shrink-0">
          <div className="mb-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Questions</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {MOCK_QUESTIONS.map((q, i) => {
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
              <span className="font-bold text-brand-600">{answeredCount}/{MOCK_QUESTIONS.length}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(answeredCount/MOCK_QUESTIONS.length)*100}%` }}></div>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl font-bold text-white text-xs bg-gray-900 hover:bg-black transition-colors shadow-sm"
            >
              Submit Assessment
            </button>
          </div>
        </aside>

        {/* Main Content Area - Strictly contained */}
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

              {/* Scrollable container for question and options if they get too long */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-base md:text-lg font-medium text-gray-900 mb-6 leading-relaxed">
                  {currentQ.text}
                </h2>

                <div className="space-y-2.5">
                  {currentQ.type === 'mcq-single' && currentQ.options.map((opt, i) => (
                    <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      answers[currentQ.id] === opt 
                        ? 'border-brand-400 bg-brand-50/50 shadow-sm' 
                        : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'
                    }`}>
                      <div className={`w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center mr-3 transition-colors ${
                        answers[currentQ.id] === opt ? 'border-brand-500' : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === opt && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                      </div>
                      <input type="radio" className="hidden" checked={answers[currentQ.id] === opt} onChange={() => handleAnswerChange(opt)} />
                      <span className="text-gray-800 text-sm font-medium leading-snug">{opt}</span>
                    </label>
                  ))}

                  {currentQ.type === 'mcq-multiple' && currentQ.options.map((opt, i) => {
                    const isChecked = (answers[currentQ.id] || []).includes(opt);
                    return (
                      <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-brand-400 bg-brand-50/50 shadow-sm' 
                          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'
                      }`}>
                        <div className={`w-4 h-4 flex-shrink-0 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                          isChecked ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                        }`}>
                          {isChecked && <div className="text-white text-[10px] font-bold flex items-center justify-center">✓</div>}
                        </div>
                        <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => {
                          const currentAnswers = answers[currentQ.id] || [];
                          const newAnswers = e.target.checked ? [...currentAnswers, opt] : currentAnswers.filter(a => a !== opt);
                          handleAnswerChange(newAnswers);
                        }} />
                        <span className="text-gray-800 text-sm font-medium leading-snug">{opt}</span>
                      </label>
                    )
                  })}

                  {currentQ.type === 'true-false' && ['True', 'False'].map((opt, i) => (
                    <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      answers[currentQ.id] === opt 
                        ? 'border-brand-400 bg-brand-50/50 shadow-sm' 
                        : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'
                    }`}>
                      <div className={`w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center mr-3 transition-colors ${
                        answers[currentQ.id] === opt ? 'border-brand-500' : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === opt && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                      </div>
                      <input type="radio" className="hidden" checked={answers[currentQ.id] === opt} onChange={() => handleAnswerChange(opt)} />
                      <span className="text-gray-800 text-sm font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 flex-shrink-0">
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="flex items-center px-4 py-2.5 rounded-full font-semibold text-xs text-gray-600 bg-white border border-gray-100 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={14} className="mr-1" /> Prev
                </button>
                
                {currentQIndex === MOCK_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 rounded-full font-bold text-xs text-white bg-gray-900 hover:bg-black shadow-sm transition-colors lg:hidden"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(MOCK_QUESTIONS.length - 1, prev + 1))}
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

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-500 mx-auto">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">Submit Assessment?</h3>
              <p className="text-gray-500 text-sm mb-6 text-center">
                Answered <span className="font-bold text-gray-900">{answeredCount}</span> of {MOCK_QUESTIONS.length}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Review
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-gray-900 hover:bg-black shadow-sm transition-colors"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
