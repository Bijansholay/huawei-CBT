import { Users, FileText, Database, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const stats = [
    { name: 'Students', value: '2,845', icon: Users, color: 'text-brand-500', bg: 'bg-pastel-purple' },
    { name: 'Active Exams', value: '14', icon: FileText, color: 'text-green-600', bg: 'bg-pastel-green' },
    { name: 'Questions', value: '4,289', icon: Database, color: 'text-blue-500', bg: 'bg-pastel-blue' },
    { name: 'Avg Score', value: '76%', icon: TrendingUp, color: 'text-pink-500', bg: 'bg-pastel-pink' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Overview</h1>
        <p className="text-gray-500 text-sm">Monitor your assessment ecosystem.</p>
      </div>

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
            <button className="text-xs text-gray-500 font-medium hover:text-gray-900">
              See All
            </button>
          </div>
          <div className="flex-1 bg-white">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-pastel-blue flex items-center justify-center text-blue-600 font-semibold text-sm">
                    ST
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">Student {i}</p>
                    <p className="text-xs text-gray-500">CS 101 Completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600">
                    {80 + i}%
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">{i}h ago</p>
                </div>
              </div>
            ))}
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
