import { useEffect } from 'react';
import { useExam } from '../../context/ExamContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/student/Navbar';
import { motion } from 'framer-motion';
import { Clock, BookOpen, AlertCircle, Play } from 'lucide-react';
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
              <button className="pill-button bg-gray-900 text-white">Refresh List</button>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
                📚
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Exams</h2>
          <button onClick={() => loadExams().catch(() => {})} className="text-sm text-gray-500 hover:text-gray-900">
            Refresh
          </button>
        </div>

        {isExamLoading ? (
          <div className="soft-card p-6 text-sm text-gray-500">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="soft-card p-6 text-sm text-gray-500">
            No exams have been assigned to your account yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {exams.map((exam, index) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                key={exam.id}
                className="soft-card p-4 flex flex-col relative overflow-hidden group bg-white"
              >
                <div className="mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {String(exam.status || 'draft')}
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
                    className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <Play size={12} className="ml-0.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
