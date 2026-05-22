import { useState } from 'react';
import { Plus, Search, Clock, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exams, setExams] = useState([
    { id: 1, title: 'Introduction to Computer Science', duration: 60, status: 'Active', students: 120, questions: 50 },
    { id: 2, title: 'Data Structures and Algorithms', duration: 90, status: 'Draft', students: 85, questions: 40 },
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Exams</h1>
          <p className="text-gray-500 text-sm">Create and manage tests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="pill-button bg-brand-500 text-white flex items-center hover:bg-brand-600 shadow-sm"
        >
          <Plus size={16} className="mr-1.5" /> Create Exam
        </button>
      </div>

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search exams..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-[11px] uppercase font-bold tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900 text-sm">{exam.title}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center text-xs font-medium text-gray-500">
                      <Clock size={12} className="mr-1.5" />
                      {exam.duration}m
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      exam.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">New Exam</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Title</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900" placeholder="e.g. Midterms" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Duration (m)</label>
                    <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900" placeholder="60" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Pass Mark (%)</label>
                    <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900" placeholder="50" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
                <button className="pill-button bg-brand-500 hover:bg-brand-600 text-white">Create Exam</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
