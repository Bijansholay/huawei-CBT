/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getStudentExam, listStudentExams, startStudentExam, submitExam as submitExamRequest } from '../services/api';

const ExamContext = createContext();

export const useExam = () => useContext(ExamContext);

export const ExamProvider = ({ children }) => {
  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [lastSubmission, setLastSubmission] = useState(null);
  const [isExamLoading, setIsExamLoading] = useState(false);

  const loadExams = useCallback(async () => {
    setIsExamLoading(true);
    try {
      const data = await listStudentExams();
      setExams(data.exams || []);
      return data.exams || [];
    } finally {
      setIsExamLoading(false);
    }
  }, []);

  const startExam = useCallback(async (examId) => {
    setIsExamLoading(true);
    try {
      const [examData] = await Promise.all([
        getStudentExam(examId),
        startStudentExam(examId)
      ]);
      setCurrentExam(examData.exam || null);
      setCurrentQuestions(examData.questions || []);
      setAnswers({});
      return examData;
    } finally {
      setIsExamLoading(false);
    }
  }, []);

  const saveAnswer = useCallback((questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const submitExam = useCallback(async (examId) => {
    const resolvedExamId = examId || currentExam?.id;
    if (!resolvedExamId) {
      throw new Error('No active exam to submit');
    }

    const result = await submitExamRequest(resolvedExamId, answers);
    setLastSubmission({
      examId: resolvedExamId,
      result: result.result || null
    });
    setCurrentExam(null);
    setCurrentQuestions([]);
    setAnswers({});
    return result;
  }, [answers, currentExam?.id]);

  const value = useMemo(() => {
    return {
      exams,
      currentExam,
      currentQuestions,
      answers,
      lastSubmission,
      isExamLoading,
      loadExams,
      startExam,
      saveAnswer,
      submitExam,
      clearCurrentExam: () => {
        setCurrentExam(null);
        setCurrentQuestions([]);
        setAnswers({});
      }
    };
  }, [answers, currentExam, currentQuestions, exams, isExamLoading, lastSubmission, loadExams, saveAnswer, startExam, submitExam]);

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
};
