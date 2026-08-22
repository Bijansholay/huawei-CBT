import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download, Eye, CheckCircle2, XCircle, X, Clock, Target, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminResults, getAdminSessionReview } from '../../services/api';

export default function ResultManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionReview, setSessionReview] = useState(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const handleViewDetails = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setSessionReview(null);
    setReviewError('');
    setIsReviewLoading(true);
    try {
      const data = await getAdminSessionReview(sessionId);
      setSessionReview(data);
    } catch (err) {
      setReviewError(err.message || 'Failed to load session review details.');
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedSessionId(null);
    setSessionReview(null);
    setReviewError('');
  };

  useEffect(() => {
    let active = true;
    async function loadResults() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getAdminResults();
        if (active) setResults(data.results || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load results');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadResults();
    return () => {
      active = false;
    };
  }, []);

  const normalizedResults = useMemo(() => {
    return results.map((result) => {
      const score = Number(result.percentage ?? 0);
      return {
        id: result.id,
        student: result.student?.surname || 'Student',
        matric: result.student?.matricNumber || 'N/A',
        course: result.exam?.title || 'Untitled exam',
        score,
        status: score >= 50 ? 'Pass' : 'Fail',
        date: result.completedAt ? new Date(result.completedAt).toISOString().slice(0, 10) : '-'
      };
    });
  }, [results]);

  const filteredResults = useMemo(() => {
    return normalizedResults.filter((result) => {
      const matchesSearch =
        result.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.matric.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse = filterCourse === 'All' || result.course === filterCourse;
      const matchesStatus = filterStatus === 'All' || result.status === filterStatus;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [searchTerm, filterCourse, filterStatus, normalizedResults]);

  const courses = ['All', ...new Set(normalizedResults.map((r) => r.course))];

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

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

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
                {courses.map((course) => (
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
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading results...</div>
          ) : filteredResults.length > 0 ? (
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
                {filteredResults.map((result) => (
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
                      <button
                        onClick={() => handleViewDetails(result.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-gray-500">No results found.</div>
          )}
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

      <AnimatePresence>
        {selectedSessionId && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 animate-fade-in">Attempt Breakdown</h3>
                  <p className="text-xs text-gray-500 font-medium">Detailed question-by-question review</p>
                </div>
                <button onClick={handleCloseModal} className="p-1.5 rounded-full text-gray-400 hover:text-gray-950 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50">
                {isReviewLoading ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">Loading attempt details...</div>
                ) : reviewError ? (
                  <div className="p-5 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">{reviewError}</div>
                ) : sessionReview ? (
                  <div className="space-y-6">
                    {/* Summary Header Card */}
                    <div className="soft-card p-6 text-center relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
                      <div className="text-left relative z-10 flex-1 flex items-center gap-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600">
                          <Award size={24} />
                        </div>
                        <div>
                          <h1 className="text-lg font-bold text-gray-900 mb-0.5">
                            {sessionReview.session?.student?.surname || 'Student'}
                          </h1>
                          <p className="text-gray-500 text-xs font-semibold">
                            {sessionReview.session?.student?.matricNumber || 'N/A'} • {sessionReview.session?.exam?.title || 'Exam'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 w-full md:w-auto">
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                          <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                            <Target size={12} className="text-gray-400" /> Score
                          </div>
                          <div className="text-base font-bold text-gray-900">{sessionReview.session?.percentage}%</div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center min-w-[90px]">
                          <div className="flex justify-center items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">
                            <CheckCircle2 size={12} /> Correct
                          </div>
                          <div className="text-base font-bold text-green-700">{sessionReview.session?.score}</div>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center min-w-[90px]">
                          <div className="flex justify-center items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">
                            <XCircle size={12} /> Wrong
                          </div>
                          <div className="text-base font-bold text-red-700">
                            {Math.max(0, (sessionReview.session?.totalQuestions || 0) - (sessionReview.session?.score || 0))}
                          </div>
                        </div>
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 text-center min-w-[90px]">
                          <div className="flex justify-center items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                            <Clock size={12} className="text-gray-400" /> Time Taken
                          </div>
                          <div className="text-xs font-bold text-gray-900 mt-1">
                            {sessionReview.session?.completedAt && sessionReview.session?.startedAt
                              ? `${Math.max(0, Math.round((new Date(sessionReview.session.completedAt) - new Date(sessionReview.session.startedAt)) / 60000))}m`
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Question Reviews */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-4 h-1.5 bg-brand-500 rounded-full"></span> Response Details
                      </h4>

                      {sessionReview.review && sessionReview.review.length > 0 ? (
                        sessionReview.review.map((item, idx) => {
                          const isCorrect = item.isCorrect;
                          return (
                            <div key={item.questionId || idx} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-soft">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="text-xs font-semibold text-gray-500">Question {idx + 1}</span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {isCorrect ? (
                                    <><CheckCircle2 size={12} /> Correct</>
                                  ) : (
                                    <><XCircle size={12} /> Incorrect</>
                                  )}
                                </span>
                              </div>

                              <h3 className="text-sm font-semibold text-gray-900 mb-4 leading-snug">
                                {item.question}
                              </h3>

                              <div className="grid sm:grid-cols-2 gap-2 mb-4">
                                {item.options.map((opt) => {
                                  const selectedLabels = String(item.selectedOption || '').split(',');
                                  const correctLabels = String(item.correctOption || '').split(',');
                                  const isSelected = selectedLabels.includes(opt.label);
                                  const isCorrectOpt = correctLabels.includes(opt.label);

                                  let optClass = 'bg-gray-50/50 border-gray-100 text-gray-600';
                                  if (isCorrectOpt) {
                                    optClass = 'bg-green-50 border-green-200 text-green-700 font-semibold';
                                  } else if (isSelected && !isCorrectOpt) {
                                    optClass = 'bg-red-50 border-red-200 text-red-700 font-semibold';
                                  }

                                  return (
                                    <div key={opt.label} className={`p-3 rounded-xl text-xs border flex items-center justify-between ${optClass}`}>
                                      <span>
                                        <span className="font-bold mr-1.5">{opt.label})</span>
                                        {opt.text}
                                      </span>
                                      {isCorrectOpt && <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 ml-2" />}
                                      {isSelected && !isCorrectOpt && <XCircle size={14} className="text-red-600 flex-shrink-0 ml-2" />}
                                    </div>
                                  );
                                })}
                              </div>

                              {item.explanation && (
                                <div className="bg-amber-50/40 border border-amber-100/60 rounded-2xl p-4 text-xs text-gray-700">
                                  <strong className="text-amber-800 block mb-1">Explanation:</strong>
                                  {item.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="soft-card p-5 text-sm text-gray-500 text-center">No detailed question responses captured for this attempt.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">No data found.</div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
                <button onClick={handleCloseModal} className="pill-button bg-gray-900 text-white font-semibold hover:bg-black transition-colors shadow-sm">
                  Close Breakdown
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
