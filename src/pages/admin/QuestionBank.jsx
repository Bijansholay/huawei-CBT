import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Search, Sparkles, Upload, FileText, AlertCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createQuestion,
  deleteQuestion,
  generateQuestionsFromFile,
  listExams,
  listQuestions,
  updateQuestion
} from '../../services/api';

const emptyForm = {
  examId: '',
  question: '',
  optionsText: '',
  correctOption: '',
  explanation: ''
};

function optionsToText(options) {
  if (Array.isArray(options)) {
    return options
      .map((option) => {
        if (typeof option === 'string') return option;
        if (option?.text) return option.text;
        return option?.label || '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (options && typeof options === 'object') {
    return Object.values(options).filter(Boolean).join('\n');
  }

  return '';
}

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('ai');
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [counts, setCounts] = useState({ easy: 2, medium: 30, hard: 10 });
  const [typeCounts, setTypeCounts] = useState({ single: 30, multiple: 5, trueFalse: 7 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [error, setError] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [questionForm, setQuestionForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const totalTypes = typeCounts.single + typeCounts.multiple + typeCounts.trueFalse;
  const totalDiffs = counts.easy + counts.medium + counts.hard;

  const examMap = useMemo(() => {
    return new Map(exams.map((exam) => [exam.id, exam]));
  }, [exams]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [questionData, examData] = await Promise.all([
        listQuestions(),
        listExams()
      ]);
      setQuestions(questionData.questions || []);
      setExams(examData.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load question data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadData()).catch(() => {});
  }, []);

  const filteredQuestions = questions.filter((question) => {
    const text = `${question.question || question.question_text || ''} ${question.correctOption || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop a valid PDF file.');
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please upload a PDF file first.');
      return;
    }

    if (!selectedExamId) {
      setError('Select an exam so generated questions can be saved to the bank.');
      return;
    }

    if (totalTypes === 0) {
      setError('Please request at least one question type.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const data = await generateQuestionsFromFile(file, totalTypes, 'medium', {
        typeCounts,
        difficultyCounts: counts,
        examId: selectedExamId
      });

      setGeneratedQuestions(data.questions);
      setSuccessMessage('Generated questions saved to the selected exam.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetGenerator = () => {
    setFile(null);
    setGeneratedQuestions(null);
    setCounts({ easy: 2, medium: 30, hard: 10 });
    setTypeCounts({ single: 30, multiple: 5, trueFalse: 7 });
    setError(null);
    setSuccessMessage('');
  };

  const openCreateForm = () => {
    setEditingQuestionId('');
    setQuestionForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (question) => {
    setEditingQuestionId(question.id);
    setQuestionForm({
      examId: question.examId || question.exam_id || '',
      question: question.question || question.question_text || '',
      optionsText: optionsToText(question.options),
      correctOption: question.correctOption || question.correct_option || '',
      explanation: question.explanation || ''
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingQuestionId('');
    setQuestionForm(emptyForm);
    setFormError('');
  };

  const handleSaveQuestion = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');

    try {
      const options = questionForm.optionsText
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);

      if (!questionForm.examId) throw new Error('Please choose an exam');
      if (!questionForm.question.trim()) throw new Error('Question text is required');
      if (options.length < 2) throw new Error('Add at least two answer options');
      if (!questionForm.correctOption.trim()) throw new Error('Correct answer is required');

      const payload = {
        examId: questionForm.examId,
        question: questionForm.question.trim(),
        options,
        correctOption: questionForm.correctOption.trim(),
        explanation: questionForm.explanation.trim()
      };

      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload);
        setSuccessMessage('Question updated successfully.');
      } else {
        await createQuestion(payload);
        setSuccessMessage('Question created successfully.');
      }

      closeForm();
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setError(null);
    try {
      await deleteQuestion(questionId);
      setSuccessMessage('Question deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete question');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Question Bank</h1>
        <p className="text-gray-500 text-sm">Upload materials, generate questions, and manage question records</p>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="soft-card overflow-hidden mb-6">
        <div className="flex border-b border-gray-50 p-2 gap-2 bg-gray-50/50">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ai' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={14} /> AI Generator
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Creation
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!generatedQuestions ? (
                  <div className="max-w-xl mx-auto py-2">
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}

                    <div
                      className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-colors cursor-pointer mb-6 ${
                        file ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 hover:border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />

                      {file ? (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-500 shadow-sm mb-3">
                            <FileText size={24} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                          <p className="text-xs text-brand-600 mt-1 font-medium">Click or drag to replace</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload size={32} className="text-gray-400 mb-3" />
                          <p className="text-sm font-semibold text-gray-900">Upload PDF Material</p>
                          <p className="text-xs text-gray-500 mt-1">Drag and drop or click to browse</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50/50 rounded-[1.5rem] p-5 mb-6 border border-gray-100 space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Target Exam</h3>
                        </div>
                        <select
                          value={selectedExamId}
                          onChange={(event) => setSelectedExamId(event.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                        >
                          <option value="">Select exam to save generated questions</option>
                          {exams.map((exam) => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                          ))}
                        </select>
                        <p className="text-[11px] text-gray-500 mt-2 ml-1">
                          AI generation stores questions directly under the selected exam.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Question Types</h3>
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Total: {totalTypes}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5 ml-1">Single Choice</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={typeCounts.single}
                              onChange={(e) => setTypeCounts({ ...typeCounts, single: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5 ml-1">Multiple Choice</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={typeCounts.multiple}
                              onChange={(e) => setTypeCounts({ ...typeCounts, multiple: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5 ml-1">True / False</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={typeCounts.trueFalse}
                              onChange={(e) => setTypeCounts({ ...typeCounts, trueFalse: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Difficulty Settings</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sumsMatch ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>Total: {totalDiffs}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-green-600 uppercase mb-1.5 ml-1">Easy</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={counts.easy}
                              onChange={(e) => setCounts({ ...counts, easy: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1.5 ml-1">Medium</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={counts.medium}
                              onChange={(e) => setCounts({ ...counts, medium: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1.5 ml-1">Hard</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={counts.hard}
                              onChange={(e) => setCounts({ ...counts, hard: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-gray-100">
                        <Sparkles size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-gray-500 leading-snug font-medium">
                          <strong className="text-gray-900">Auto-Shuffle Enabled:</strong> Each student will receive a randomized selection of these {totalTypes} generated questions during the exam.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !file || !selectedExamId || (counts.easy + counts.medium + counts.hard === 0)}
                      className="pill-button bg-gray-900 text-white w-full flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 disabled:bg-gray-400"
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>Generate and Save {totalTypes} Questions</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto py-2">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-0.5">Generated Questions</h3>
                        <p className="text-xs text-gray-500">Review the AI generated content below.</p>
                      </div>
                      <button
                        onClick={resetGenerator}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 bg-gray-50 rounded-full"
                      >
                        Start Over
                      </button>
                    </div>

                    <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {generatedQuestions.map((q, idx) => (
                        <div key={q.id || `${idx}`} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-[10px] font-bold tracking-wider uppercase">AI Generated</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              q.difficulty === 'easy' || q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' :
                              q.difficulty === 'medium' || q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-gray-900 mb-4 leading-snug">
                            {idx + 1}. {q.question_text}
                          </h4>

                          <div className="grid sm:grid-cols-2 gap-2">
                            {Object.entries(q.options || {}).map(([key, optText]) => (
                              <div key={key} className="p-2.5 rounded-xl text-xs font-medium border bg-white border-gray-100 text-gray-600">
                                <span className="font-bold mr-1">{key})</span> {optText}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={resetGenerator} className="flex-1 pill-button bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100">Discard</button>
                      <button className="flex-1 pill-button bg-brand-500 text-white font-semibold hover:bg-brand-600 shadow-sm" onClick={() => setActiveTab('manual')}>
                        Edit in Bank
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-xl mx-auto space-y-4 py-2">
                  <div className="soft-card p-5 bg-white">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Manual Question Entry</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Use the question editor below the bank to create or update live questions.
                    </p>
                    <button onClick={openCreateForm} className="pill-button bg-gray-900 text-white">
                      Open Question Editor
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="soft-card overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-50 bg-white flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
          <button
            onClick={openCreateForm}
            className="pill-button bg-gray-900 text-white flex items-center justify-center hover:bg-black"
          >
            <Pencil size={16} className="mr-1.5" /> Add Question
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No questions found.</div>
          ) : (
            filteredQuestions.map((question) => (
              <div key={question.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50/50">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                      {question.questionType || question.question_type || 'MCQ'}
                    </span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold">
                      {question.difficulty || 'Unspecified'}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                      {examMap.get(question.examId || question.exam_id)?.title || 'No exam'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {question.question || question.question_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditForm(question)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit question"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete question"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingQuestionId ? 'Edit Question' : 'Add Question'}
                  </h3>
                  <p className="text-xs text-gray-500">Changes apply to the live question bank.</p>
                </div>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-900">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion}>
                <div className="p-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Exam</label>
                    <select
                      value={questionForm.examId}
                      onChange={(event) => setQuestionForm({ ...questionForm, examId: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                    >
                      <option value="">Select an exam</option>
                      {exams.map((exam) => (
                        <option key={exam.id} value={exam.id}>{exam.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Correct Answer</label>
                    <input
                      type="text"
                      value={questionForm.correctOption}
                      onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
                      placeholder="Must match one option exactly"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Question</label>
                    <textarea
                      rows="3"
                      value={questionForm.question}
                      onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm outline-none text-gray-900 resize-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Options</label>
                    <textarea
                      rows="5"
                      value={questionForm.optionsText}
                      onChange={(event) => setQuestionForm({ ...questionForm, optionsText: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm outline-none text-gray-900 resize-none focus:ring-2 focus:ring-brand-200"
                      placeholder="Enter one option per line"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Explanation</label>
                    <textarea
                      rows="3"
                      value={questionForm.explanation}
                      onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm outline-none text-gray-900 resize-none focus:ring-2 focus:ring-brand-200"
                      placeholder="Optional explanation shown after review"
                    />
                  </div>
                  {formError && (
                    <div className="md:col-span-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                      {formError}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-2">
                  <button type="button" onClick={closeForm} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                    Cancel
                  </button>
                  <button
                    disabled={isSaving}
                    className="pill-button bg-gray-900 text-white disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
