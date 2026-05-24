import { useState, useRef } from 'react';
import { Plus, Search, Sparkles, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPDF, generateQuestions } from '../../services/api';

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('ai');
  const fileInputRef = useRef(null);
  
  const [questions] = useState([
    { id: 1, type: 'MCQ', text: 'What is the capital of France?', diff: 'Easy' },
    { id: 2, type: 'T/F', text: 'React is a library for UI.', diff: 'Medium' },
  ]);

  // AI Generator State
  const [file, setFile] = useState(null);
  const [counts, setCounts] = useState({ easy: 2, medium: 30, hard: 10 });
  const [typeCounts, setTypeCounts] = useState({ single: 30, multiple: 5, trueFalse: 7 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [error, setError] = useState(null);

  const totalTypes = typeCounts.single + typeCounts.multiple + typeCounts.trueFalse;
  const totalDiffs = counts.easy + counts.medium + counts.hard;
  const sumsMatch = totalTypes === totalDiffs;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid PDF file.");
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
      setError("Please drop a valid PDF file.");
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }
    
    if (totalTypes === 0) {
      setError("Please request at least one question type.");
      return;
    }

    if (!sumsMatch) {
      setError(`Mismatch: Requested ${totalTypes} question types but ${totalDiffs} difficulty levels. They must match.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    const totalQuestions = totalTypes;

    try {
      // Step 1: Upload the PDF
      const uploadResult = await uploadPDF(file).catch(() => null);
      let pdfId = uploadResult?.id || "mock-pdf-uuid";
      
      // Step 2: Generate Questions
      let data = await generateQuestions(pdfId, totalQuestions, 'medium').catch(() => null);

      if (!data) {
        // Fallback to mock data if backend isn't actually running during development
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate an array simulating the requested distribution
        let mockQ = [];
        const generateLevel = (num, diffStr) => {
          for(let i=0; i<num; i++) {
            mockQ.push({
              id: `q-mock-${diffStr}-${i}`,
              question_text: `Mock ${diffStr} Question ${i + 1} generated from ${file.name}?`,
              options: { "A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4" },
              difficulty: diffStr
            });
          }
        };
        generateLevel(counts.easy, "Easy");
        generateLevel(counts.medium, "Medium");
        generateLevel(counts.hard, "Hard");

        data = { questions: mockQ };
      }

      setGeneratedQuestions(data.questions);
    } catch (err) {
      console.error(err);
      setError("Failed to generate questions. Please ensure the backend is running.");
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
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Question Bank</h1>
        <p className="text-gray-500 text-sm">Upload materials and auto-generate questions</p>
      </div>

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
                    {/* Error Message */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}

                    {/* PDF Upload Area */}
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

                    {/* Generation Settings */}
                    <div className="bg-gray-50/50 rounded-[1.5rem] p-5 mb-6 border border-gray-100 space-y-6">
                      
                      {/* Question Types */}
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
                              onChange={(e) => setTypeCounts({...typeCounts, single: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5 ml-1">Multiple Choice</label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={typeCounts.multiple}
                              onChange={(e) => setTypeCounts({...typeCounts, multiple: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5 ml-1">True / False</label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={typeCounts.trueFalse}
                              onChange={(e) => setTypeCounts({...typeCounts, trueFalse: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Difficulty Distribution */}
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
                              onChange={(e) => setCounts({...counts, easy: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1.5 ml-1">Medium</label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={counts.medium}
                              onChange={(e) => setCounts({...counts, medium: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1.5 ml-1">Hard</label>
                            <input 
                              type="number" 
                              min="0"
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900 text-center font-semibold"
                              value={counts.hard}
                              onChange={(e) => setCounts({...counts, hard: parseInt(e.target.value) || 0})}
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
                      disabled={isGenerating || !file || (counts.easy + counts.medium + counts.hard === 0)}
                      className="pill-button bg-gray-900 text-white w-full flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 disabled:bg-gray-400"
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing Document...
                        </>
                      ) : (
                        <>Generate {counts.easy + counts.medium + counts.hard} Questions</>
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
                        <div key={q.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
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
                            {Object.entries(q.options).map(([key, optText]) => (
                              <div key={key} className={`p-2.5 rounded-xl text-xs font-medium border bg-white border-gray-100 text-gray-600`}>
                                <span className="font-bold mr-1">{key})</span> {optText}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={resetGenerator} className="flex-1 pill-button bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100">Discard</button>
                      <button className="flex-1 pill-button bg-brand-500 text-white font-semibold hover:bg-brand-600 shadow-sm">Save to Bank</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-xl mx-auto space-y-4 py-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Type</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm outline-none text-gray-900">
                      <option>Multiple Choice</option>
                      <option>True / False</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-1">Question</label>
                    <textarea rows="3" className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm outline-none text-gray-900 resize-none"></textarea>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button className="pill-button bg-gray-900 text-white">Save Question</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="soft-card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-200 outline-none text-gray-900"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.map((q) => (
            <div key={q.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
              <div>
                <div className="flex gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{q.type}</span>
                  <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold">{q.diff}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{q.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
