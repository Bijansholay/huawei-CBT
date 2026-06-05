import { useEffect, useState } from 'react';
import { Plus, Search, Clock, Edit2, Trash2, Users, Sparkles, X, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createExam,
  deleteExam,
  enrollStudents,
  getExamStudents,
  listExams,
  listStudents,
  updateExam,
  generateQuestionsFromFile
} from '../../services/api';

export default function ExamManagement() {
  const [showModal, setShowModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationExam, setGenerationExam] = useState(null);
  const [generationFile, setGenerationFile] = useState(null);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState('');
  const [generationCounts, setGenerationCounts] = useState({ easy: 2, medium: 30, hard: 10 });
  const [generationTypeCounts, setGenerationTypeCounts] = useState({ single: 30, multiple: 5, trueFalse: 7 });
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [editingExamId, setEditingExamId] = useState('');
  const [form, setForm] = useState({ title: '', durationMinutes: '', totalQuestions: '', status: 'draft' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  async function loadExams() {
    setIsLoading(true);
    setError('');
    try {
      const data = await listExams();
      setExams(data.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadExams()).catch(() => {});
  }, []);

  const filteredExams = exams.filter((exam) => {
    const text = `${exam.title || ''} ${exam.status || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const totalGenerationTypes = generationTypeCounts.single + generationTypeCounts.multiple + generationTypeCounts.trueFalse;
  const totalGenerationDiffs = generationCounts.easy + generationCounts.medium + generationCounts.hard;

  const resetForm = () => {
    setEditingExamId('');
    setForm({ title: '', durationMinutes: '', totalQuestions: '', status: 'draft' });
    setShowModal(false);
  };

  const startCreate = () => {
    setEditingExamId('');
    setForm({ title: '', durationMinutes: '', totalQuestions: '', status: 'draft' });
    setShowModal(true);
  };

  const startEdit = (exam) => {
    setEditingExamId(exam.id);
    setForm({
      title: exam.title || '',
      durationMinutes: String(exam.durationMinutes || exam.duration_minutes || ''),
      totalQuestions: String(exam.totalQuestions || exam.total_questions || ''),
      status: exam.status || 'draft'
    });
    setShowModal(true);
  };

  const startGenerate = (exam) => {
    setGenerationExam(exam);
    setGenerationFile(null);
    setGenerationError('');
    setGenerationSuccess('');
    setGenerationCounts({ easy: 2, medium: 30, hard: 10 });
    setGenerationTypeCounts({ single: 30, multiple: 5, trueFalse: 7 });
    setShowGenerateModal(true);
  };

  const loadEnrollment = async (exam) => {
    setError('');
    try {
      const [studentData, enrolledData] = await Promise.all([
        listStudents(),
        getExamStudents(exam.id)
      ]);

      const allStudents = studentData.students || [];
      const enrolled = enrolledData.students || [];
      setStudents(allStudents);
      setEnrolledStudents(enrolled);
      setSelectedStudentIds(enrolled.map((student) => student.id));
      setCurrentExam(exam);
      setShowEnrollModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load enrollment data');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        totalQuestions: Number(form.totalQuestions)
      };

      if (editingExamId) {
        await updateExam(editingExamId, payload);
      } else {
        await createExam(payload);
      }

      resetForm();
      await loadExams();
    } catch (err) {
      setError(err.message || 'Failed to save exam');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (examId) => {
    setError('');
    try {
      await deleteExam(examId);
      await loadExams();
    } catch (err) {
      setError(err.message || 'Failed to delete exam');
    }
  };

  const handleEnrollSave = async () => {
    if (!currentExam) return;
    setIsEnrolling(true);
    setError('');
    try {
      await enrollStudents(currentExam.id, selectedStudentIds);
      setShowEnrollModal(false);
      setCurrentExam(null);
      setSelectedStudentIds([]);
      setEnrolledStudents([]);
      await loadExams();
    } catch (err) {
      setError(err.message || 'Failed to enroll students');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleGenerationFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setGenerationFile(selectedFile);
      setGenerationError('');
    } else {
      setGenerationError('Please select a valid PDF file.');
      setGenerationFile(null);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!generationExam) return;
    if (!generationFile) {
      setGenerationError('Please upload a PDF file first.');
      return;
    }

    setIsGeneratingQuestions(true);
    setGenerationError('');
    setGenerationSuccess('');

    try {
      await generateQuestionsFromFile(generationFile, totalGenerationTypes, 'medium', {
        typeCounts: generationTypeCounts,
        difficultyCounts: generationCounts,
        examId: generationExam.id
      });
      setGenerationSuccess('Questions generated and saved to this exam.');
      await loadExams();
    } catch (err) {
      setGenerationError(err.message || 'Failed to generate questions');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Exams</h1>
          <p className="text-gray-500 text-sm">Create exams and assign students</p>
        </div>
        <button
          onClick={startCreate}
          className="pill-button bg-brand-500 text-white flex items-center hover:bg-brand-600 shadow-sm"
        >
          <Plus size={16} className="mr-1.5" /> Create Exam
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {generationSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
          {generationSuccess}
        </div>
      )}

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exams..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading exams...</div>
          ) : filteredExams.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No exams found.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-[11px] uppercase font-bold tracking-widest text-gray-400">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Questions</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 text-sm">{exam.title}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center text-xs font-medium text-gray-500">
                        <Clock size={12} className="mr-1.5" />
                        {exam.durationMinutes || exam.duration_minutes || 0}m
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {exam.totalQuestions || exam.total_questions || 0}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        String(exam.status || '').toLowerCase() === 'active'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {exam.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startGenerate(exam)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Generate questions"
                        >
                          <Sparkles size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadEnrollment(exam)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Enroll students"
                        >
                          <Users size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(exam)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exam.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">{editingExamId ? 'Edit Exam' : 'New Exam'}</h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-900">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Title</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Duration (m)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.durationMinutes}
                        onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Questions</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.totalQuestions}
                        onChange={(event) => setForm({ ...form, totalQuestions: event.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(event) => setForm({ ...form, status: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                  <button type="button" onClick={resetForm} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    Cancel
                  </button>
                  <button disabled={isSaving} className="pill-button bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60">
                    {isSaving ? 'Saving...' : editingExamId ? 'Update Exam' : 'Create Exam'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEnrollModal && currentExam && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Enroll Students</h3>
                  <p className="text-xs text-gray-500">{currentExam.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEnrollModal(false);
                    setCurrentExam(null);
                    setSelectedStudentIds([]);
                    setEnrolledStudents([]);
                  }}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 text-sm text-gray-500">
                  Select the students who should take this exam. Currently enrolled: {enrolledStudents.length}
                </div>

                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                  {students.length === 0 ? (
                    <div className="text-sm text-gray-500">No students available.</div>
                  ) : (
                    students.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{student.surname || 'Student'}</div>
                            <div className="text-xs text-gray-500">{student.matricNumber || 'No matric'}{student.email ? ` · ${student.email}` : ''}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selectedStudentIds, student.id]
                                : selectedStudentIds.filter((id) => id !== student.id);
                              setSelectedStudentIds(next);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-200"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setCurrentExam(null);
                    setSelectedStudentIds([]);
                    setEnrolledStudents([]);
                  }}
                  className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollSave}
                  disabled={isEnrolling}
                  className="pill-button bg-gray-900 text-white disabled:opacity-60"
                >
                  {isEnrolling ? 'Saving...' : 'Save Enrollment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGenerateModal && generationExam && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Generate Questions</h3>
                  <p className="text-xs text-gray-500">{generationExam.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenerationExam(null);
                    setGenerationFile(null);
                    setGenerationError('');
                    setGenerationSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {generationError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                    {generationError}
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-[2rem] p-6 text-center transition-colors cursor-pointer ${
                    generationFile ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 hover:border-gray-300'
                  }`}
                  onClick={() => document.getElementById('exam-generate-upload')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && droppedFile.type === 'application/pdf') {
                      setGenerationFile(droppedFile);
                      setGenerationError('');
                    } else {
                      setGenerationError('Please drop a valid PDF file.');
                    }
                  }}
                >
                  <input
                    id="exam-generate-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleGenerationFileChange}
                  />
                  {generationFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-500 shadow-sm mb-3">
                        <FileText size={24} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{generationFile.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload size={32} className="text-gray-400 mb-3" />
                      <p className="text-sm font-semibold text-gray-900">Upload PDF Material</p>
                      <p className="text-xs text-gray-500 mt-1">Click or drag a PDF here</p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 rounded-[1.5rem] p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Question Types</h4>
                      <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Total: {totalGenerationTypes}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" min="0" value={generationTypeCounts.single} onChange={(e) => setGenerationTypeCounts({ ...generationTypeCounts, single: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                      <input type="number" min="0" value={generationTypeCounts.multiple} onChange={(e) => setGenerationTypeCounts({ ...generationTypeCounts, multiple: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                      <input type="number" min="0" value={generationTypeCounts.trueFalse} onChange={(e) => setGenerationTypeCounts({ ...generationTypeCounts, trueFalse: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-[1.5rem] p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty Settings</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-600 bg-gray-100">Difficulty total: {totalGenerationDiffs}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" min="0" value={generationCounts.easy} onChange={(e) => setGenerationCounts({ ...generationCounts, easy: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                      <input type="number" min="0" value={generationCounts.medium} onChange={(e) => setGenerationCounts({ ...generationCounts, medium: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                      <input type="number" min="0" value={generationCounts.hard} onChange={(e) => setGenerationCounts({ ...generationCounts, hard: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-center" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenerationExam(null);
                    setGenerationFile(null);
                    setGenerationError('');
                    setGenerationSuccess('');
                  }}
                  className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions || !generationFile}
                  className="pill-button bg-gray-900 text-white disabled:opacity-60"
                >
                  {isGeneratingQuestions ? 'Generating...' : 'Generate and Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
