import { useState, useMemo } from 'react';
import { Search, Filter, Download, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [results] = useState([
    { id: 1, student: 'John Smith', matric: 'CST/2021/001', course: 'Computer Science 101', score: 85, status: 'Pass', date: '2023-10-25' },
    { id: 2, student: 'Emma Johnson', matric: 'CST/2021/002', course: 'Data Structures', score: 45, status: 'Fail', date: '2023-10-26' },
    { id: 3, student: 'Michael Williams', matric: 'CST/2021/003', course: 'Computer Science 101', score: 92, status: 'Pass', date: '2023-10-26' },
    { id: 4, student: 'Sarah Davis', matric: 'CST/2021/004', course: 'Web Development', score: 78, status: 'Pass', date: '2023-10-27' },
    { id: 5, student: 'David Miller', matric: 'CST/2021/005', course: 'Data Structures', score: 60, status: 'Pass', date: '2023-10-27' },
  ]);

  const filteredResults = useMemo(() => {
    return results.filter(result => {
      const matchesSearch = 
        result.student.toLowerCase().includes(searchTerm.toLowerCase()) || 
        result.matric.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCourse = filterCourse === 'All' || result.course === filterCourse;
      const matchesStatus = filterStatus === 'All' || result.status === filterStatus;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [searchTerm, filterCourse, filterStatus, results]);

  // Extract unique courses for the dropdown
  const courses = ['All', ...new Set(results.map(r => r.course))];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Student Results</h1>
          <p className="text-gray-500 text-sm">Review, filter, and export assessment scores</p>
        </div>
        <button className="pill-button bg-gray-900 text-white flex items-center hover:bg-black transition-colors shadow-sm">
          <Download size={14} className="mr-1.5" /> Export CSV
        </button>
      </div>

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by student name or matric no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 transition-shadow"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="h-3 w-3 text-gray-400" />
              </div>
              <select 
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-700 appearance-none cursor-pointer transition-shadow"
              >
                {courses.map(course => (
                  <option key={course} value={course}>{course === 'All' ? 'All Courses' : course}</option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[120px]">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-4 pr-8 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-700 appearance-none cursor-pointer transition-shadow"
              >
                <option value="All">All Status</option>
                <option value="Pass">Passed</option>
                <option value="Fail">Failed</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-bold tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4">Course / Exam</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredResults.length > 0 ? (
                filteredResults.map((result) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={result.id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <p className="font-semibold text-gray-900 text-sm mb-0.5">{result.student}</p>
                      <p className="font-mono text-xs text-gray-500">{result.matric}</p>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-800 text-sm mb-0.5">{result.course}</p>
                      <p className="text-xs text-gray-500">{result.date}</p>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="font-bold text-gray-900 text-sm">{result.score}%</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        result.status === 'Pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {result.status === 'Pass' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">
                    No results found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Showing {filteredResults.length} records</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 text-xs font-semibold text-gray-400 cursor-not-allowed">Prev</button>
            <button className="px-2 py-1 text-xs font-semibold text-gray-900">1</button>
            <button className="px-2 py-1 text-xs font-semibold text-gray-400 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
