import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/student/Navbar';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Target, Award } from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const result = {
    score: 85,
    totalQuestions: 20,
    correctAnswers: 17,
    wrongAnswers: 3,
    timeTaken: '45m 12s',
  };

  const MOCK_REVIEW = [
    { id: 1, text: 'What is the capital of France?', userAnswer: 'Paris', correctAnswer: 'Paris', isCorrect: true, explanation: 'Paris is the capital and most populous city of France.' },
    { id: 2, text: 'Which of these are programming languages?', userAnswer: 'HTML, Banana', correctAnswer: 'HTML, Python, Java', isCorrect: false, explanation: 'Banana is a fruit, not a programming language.' },
  ];

  return (
    <div className="h-screen flex flex-col bg-transparent overflow-hidden">
      <Navbar />

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 w-full flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col h-full">
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate('/student')}
              className="flex items-center text-gray-500 hover:text-gray-900 mb-4 text-xs font-semibold transition-colors bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm w-max"
            >
              <ArrowLeft size={14} className="mr-1.5" /> Back to Dashboard
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="soft-card p-6 md:p-8 text-center mb-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-pastel-green/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="text-left relative z-10 flex-1 flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600">
                  <Award size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-0.5">Assessment Complete</h1>
                  <p className="text-gray-500 text-xs font-semibold">Computer Science 101</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 w-full md:w-auto">
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                  <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                    <Target size={12} className="text-gray-400" /> Score
                  </div>
                  <div className="text-lg font-bold text-gray-900">{result.score}%</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center min-w-[90px]">
                  <div className="flex justify-center items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">
                    <CheckCircle2 size={12} /> Correct
                  </div>
                  <div className="text-lg font-bold text-green-700">{result.correctAnswers}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center min-w-[90px]">
                  <div className="flex justify-center items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">
                    <XCircle size={12} /> Wrong
                  </div>
                  <div className="text-lg font-bold text-red-700">{result.wrongAnswers}</div>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                  <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                    <Clock size={12} className="text-gray-400" /> Time
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{result.timeTaken}</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-4 h-1.5 bg-brand-500 rounded-full"></span> Performance Review
              </h2>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 pb-10 flex-shrink-0"
          >
            {MOCK_REVIEW.map((item, index) => (
              <div key={item.id} className="soft-card p-5">
                <div className="flex flex-col md:flex-row items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${item.isCorrect ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    {item.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
                      <span className="text-gray-400 mr-1.5 font-mono text-xs">{index + 1}.</span> 
                      {item.text}
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <div className={`p-3 rounded-xl border ${item.isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Answer</span>
                        <span className={`text-sm font-medium ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{item.userAnswer}</span>
                      </div>
                      {!item.isCorrect && (
                        <div className="p-3 rounded-xl border bg-gray-50 border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Correct Answer</span>
                          <span className="text-sm font-medium text-gray-900">{item.correctAnswer}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                      <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">Explanation</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
