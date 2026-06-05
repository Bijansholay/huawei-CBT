import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/student/Navbar';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Target, Award } from 'lucide-react';
import { getExamResults } from '../../services/api';
import { useExam } from '../../context/ExamContext';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lastSubmission } = useExam();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadResult() {
      try {
        const data = await getExamResults(id);
        const sessions = data.results || [];
        const latest = sessions[sessions.length - 1] || null;
        if (active) {
          Promise.resolve().then(() => setResult(latest));
        }
      } catch (err) {
        if (active) {
          Promise.resolve().then(() => setError(err.message || 'Failed to load result'));
        }
      }
    }

    if (lastSubmission?.examId === id && lastSubmission.result) {
      Promise.resolve().then(() => setResult(lastSubmission.result));
      return undefined;
    }

    loadResult();
    return () => {
      active = false;
    };
  }, [id, lastSubmission]);

  const summary = useMemo(() => {
    if (!result) return null;
    const totalQuestions = Number(result.totalQuestions || 0);
    const score = Number(result.score || 0);
    const correctAnswers = score;
    const wrongAnswers = Math.max(0, totalQuestions - score);
    return {
      score: totalQuestions ? Math.round((score / totalQuestions) * 100) : 0,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      timeTaken: result.completedAt && result.startedAt
        ? `${Math.max(0, Math.round((new Date(result.completedAt) - new Date(result.startedAt)) / 60000))}m`
        : 'N/A'
    };
  }, [result]);

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
                  <p className="text-gray-500 text-xs font-semibold">{result?.exam?.title || 'Result summary'}</p>
                </div>
              </div>

              {summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 w-full md:w-auto">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                    <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                      <Target size={12} className="text-gray-400" /> Score
                    </div>
                    <div className="text-lg font-bold text-gray-900">{summary.score}%</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center min-w-[90px]">
                    <div className="flex justify-center items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">
                      <CheckCircle2 size={12} /> Correct
                    </div>
                    <div className="text-lg font-bold text-green-700">{summary.correctAnswers}</div>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center min-w-[90px]">
                    <div className="flex justify-center items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">
                      <XCircle size={12} /> Wrong
                    </div>
                    <div className="text-lg font-bold text-red-700">{summary.wrongAnswers}</div>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                    <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                      <Clock size={12} className="text-gray-400" /> Time
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-1">{summary.timeTaken}</div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 text-sm text-gray-500">Loading result summary...</div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-4 h-1.5 bg-brand-500 rounded-full"></span> Result Details
              </h2>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 pb-10 flex-shrink-0"
          >
            {error ? (
              <div className="soft-card p-5 text-sm text-red-600">{error}</div>
            ) : result ? (
              <div className="soft-card p-5 text-sm text-gray-600">
                Detailed per-question review is not available yet. The live result summary above comes from your submitted exam record.
              </div>
            ) : (
              <div className="soft-card p-5 text-sm text-gray-500">No result data found for this exam.</div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
