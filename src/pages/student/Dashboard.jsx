import { useExam } from '../../context/ExamContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/student/Navbar';
import { motion } from 'framer-motion';
import { Clock, BookOpen, Heart, AlertCircle, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { exams } = useExam();
  const navigate = useNavigate();
  const { user } = useAuth();

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
            Hi {user?.name?.split(' ')[0] || 'Student'}, <br/>
            <span className="text-gray-500 font-light">What are we testing today?</span>
          </h1>
        </motion.div>

        {/* Featured Assessment or Continue */}
        <div className="mb-8">
          <div className="soft-card p-5 bg-gradient-to-r from-pastel-purple to-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Performance</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-[200px]">Keep track of your scores and recommendations.</p>
            <div className="flex items-center gap-3">
              <button className="pill-button bg-gray-900 text-white">View Analytics</button>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
                😐
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Exams</h2>
          <button className="text-sm text-gray-500 hover:text-gray-900">See All</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {exams.map((exam, index) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              key={exam.id}
              className={`soft-card p-4 flex flex-col relative overflow-hidden group ${
                exam.status === 'Completed' ? 'bg-pastel-green/30' : 'bg-white'
              }`}
            >
              {exam.status === 'In Progress' && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-pastel-pink rounded-bl-full -mr-8 -mt-8"></div>
              )}
              
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{exam.status}</span>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-1 line-clamp-2 leading-tight">{exam.title}</h3>
              
              <div className="flex items-center text-gray-500 text-xs mb-4 space-x-3">
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {exam.duration}m
                </div>
                <div className="flex items-center">
                  <BookOpen size={12} className="mr-1" />
                  {exam.questionsCount}q
                </div>
              </div>

              <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-50">
                <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                  <AlertCircle size={14} />
                </button>
                
                {exam.status === 'Completed' ? (
                  <button
                    onClick={() => navigate(`/student/result/${exam.id}`)}
                    className="text-xs font-semibold text-gray-900"
                  >
                    Results
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/student/exam/${exam.id}`)}
                    className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <Play size={12} className="ml-0.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
