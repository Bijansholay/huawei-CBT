import { useEffect } from 'react';
import { useExam } from '../../context/ExamContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/student/Navbar';
import { motion } from 'framer-motion';
import { Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { exams, loadExams, isExamLoading } = useExam();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadExams().catch(() => {});
  }, [loadExams]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex-1 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 mt-4"
        >
          <h1 className="text-3xl font-medium text-gray-900 leading-tight">
            Hi {user?.surname || 'Student'}, <br />
            <span className="text-gray-500 font-light">Your available exams are listed below.</span>
          </h1>
        </motion.div>

        <div className="mb-8">
          <div className="soft-card p-5 bg-gradient-to-r from-pastel-purple to-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Exam Queue</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-[260px]">
              Start any enrolled exam when it becomes available.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => loadExams().catch(() => {})} className="pill-button bg-gray-900 text-white">
                Refresh List
              </button>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
                📚
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const availableExams = exams.filter(exam => exam.status === 'active');
          
          const completedExams = [];
          exams.forEach((exam) => {
            const sessions = exam.completedSessions || [];
            sessions.forEach((session) => {
              completedExams.push({
                ...exam,
                completedSession: session
              });
            });
          });

          // Sort completed attempts by completion date descending
          completedExams.sort((a, b) => {
            const aTime = new Date(a.completedSession?.completedAt || 0).getTime();
            const bTime = new Date(b.completedSession?.completedAt || 0).getTime();
            return bTime - aTime;
          });

          return (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Available Exams</h2>
                <button onClick={() => loadExams().catch(() => {})} className="text-sm text-gray-500 hover:text-gray-900">
                  Refresh
                </button>
              </div>

              {isExamLoading ? (
                <div className="soft-card p-6 text-sm text-gray-500 mb-8">Loading exams...</div>
              ) : availableExams.length === 0 ? (
                <div className="soft-card p-6 text-sm text-gray-500 mb-8">
                  No exams are currently available for you to start.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {availableExams.map((exam, index) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      key={exam.id}
                      className="soft-card p-4 flex flex-col relative overflow-hidden group bg-white"
                    >
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          exam.activeSession ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-brand-50 text-brand-700'
                        }`}>
                          {exam.activeSession ? 'In Progress' : 'Active'}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-1 line-clamp-2 leading-tight">
                        {exam.title}
                      </h3>

                      <div className="flex items-center text-gray-500 text-xs mb-4 space-x-3">
                        <div className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          {exam.durationMinutes || exam.duration || 0}m
                        </div>
                        <div className="flex items-center">
                          <BookOpen size={12} className="mr-1" />
                          {exam.totalQuestions || exam.questionsCount || 0}q
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-50">
                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                          <AlertCircle size={14} />
                        </button>

                        <button
                          onClick={() => navigate(`/student/exam/${exam.id}`)}
                          className={`h-8 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center justify-center transition-colors ${
                            exam.activeSession 
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-gray-900 text-white hover:bg-black'
                          }`}
                        >
                          {exam.activeSession ? 'Resume' : 'Start'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mb-4 mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Exam History</h2>
              </div>

              {isExamLoading ? (
                <div className="soft-card p-6 text-sm text-gray-500">Loading history...</div>
              ) : completedExams.length === 0 ? (
                <div className="soft-card p-6 text-sm text-gray-500">
                  You haven't completed any assessments yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {completedExams.map((exam, index) => {
                    const session = exam.completedSession;
                    const percentage = session?.percentage ?? 0;
                    const pass = percentage >= 50;
                    const dateStr = session?.completedAt
                      ? new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent';

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        key={session?.id || exam.id}
                        className="soft-card p-4 flex flex-col relative overflow-hidden bg-white/80 border border-gray-100"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            pass ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {pass ? 'Passed' : 'Needs Review'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold">{dateStr}</span>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-1 line-clamp-2 leading-tight">
                          {exam.title}
                        </h3>

                        <div className="flex items-center justify-between text-xs mb-4">
                          <div className="text-gray-500 font-medium">Score</div>
                          <div className="font-bold text-gray-900">{percentage}% ({session?.score}/{session?.totalQuestions})</div>
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-50">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Completed
                          </div>

                          <button
                            onClick={() => navigate(`/student/result/${exam.id}?session=${session?.id || ''}`)}
                            className="h-8 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors flex items-center justify-center"
                          >
                            Review
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}
