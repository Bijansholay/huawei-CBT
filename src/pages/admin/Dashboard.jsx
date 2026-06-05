import { useEffect, useState } from 'react';
import { Users, FileText, Database, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAdminResults, listExams, listQuestions, listStudents } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [students, exams, questions, results] = await Promise.all([
          listStudents().catch(() => ({ students: [] })),
          listExams().catch(() => ({ exams: [] })),
          listQuestions().catch(() => ({ questions: [] })),
          getAdminResults().catch(() => ({ results: [] }))
        ]);

        if (!active) return;

        const examList = exams.exams || [];
        const resultList = results.results || [];
        const average = resultList.length
          ? Math.round(resultList.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / resultList.length)
          : 0;

        setStats([
          { name: 'Students', value: String(students.students?.length || 0), icon: Users, color: 'text-brand-500', bg: 'bg-pastel-purple' },
          { name: 'Active Exams', value: String(examList.filter((exam) => String(exam.status || '').toLowerCase() === 'active').length), icon: FileText, color: 'text-green-600', bg: 'bg-pastel-green' },
          { name: 'Questions', value: String(questions.questions?.length || 0), icon: Database, color: 'text-blue-500', bg: 'bg-pastel-blue' },
          { name: 'Avg Score', value: `${average}%`, icon: TrendingUp, color: 'text-pink-500', bg: 'bg-pastel-pink' }
        ]);

        setActivity(resultList.slice(-4).reverse());
      } catch (err) {
        if (active) setError(err.message || 'Failed to load dashboard data');
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Overview</h1>
        <p className="text-gray-500 text-sm">Monitor your assessment ecosystem.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            key={stat.name}
            className="soft-card p-5"
          >
            <div className={`w-10 h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{stat.name}</p>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 soft-card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="flex-1 bg-white">
            {activity.length === 0 ? (
              <div className="px-6 py-10 text-sm text-gray-500">No results yet.</div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-pastel-blue flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {item.student?.surname?.slice(0, 2).toUpperCase() || 'ST'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.student?.surname || 'Student'}</p>
                      <p className="text-xs text-gray-500">{item.exam?.title || 'Exam'} Completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">
                      {item.percentage}%
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {item.completedAt ? new Date(item.completedAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="soft-card overflow-hidden flex flex-col bg-gradient-to-b from-white to-pastel-purple/20">
          <div className="px-6 py-5 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">System Health</h3>
          </div>
          <div className="p-6 space-y-6 flex-1">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 font-medium">Server Load</span>
                <span className="text-gray-900 font-mono font-medium">24%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full w-[24%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 font-medium">Storage</span>
                <span className="text-gray-900 font-mono font-medium">68%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-gray-900 h-1.5 rounded-full w-[68%]"></div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs font-medium text-gray-600">All systems operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
