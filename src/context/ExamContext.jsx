import { createContext, useState, useContext } from 'react';

const ExamContext = createContext();

export const useExam = () => useContext(ExamContext);

// Mock Data
const MOCK_EXAMS = [
  { id: '1', title: 'Introduction to Computer Science', duration: 60, status: 'Not Started', questionsCount: 20 },
  { id: '2', title: 'Data Structures and Algorithms', duration: 90, status: 'Completed', score: 85, questionsCount: 40 },
  { id: '3', title: 'Web Development Basics', duration: 45, status: 'In Progress', questionsCount: 30 }
];

export const ExamProvider = ({ children }) => {
  const [exams, setExams] = useState(MOCK_EXAMS);
  const [currentExam, setCurrentExam] = useState(null);
  const [answers, setAnswers] = useState({});

  const startExam = (examId) => {
    const exam = exams.find(e => e.id === examId);
    setCurrentExam(exam);
    // Fetch questions here in real app
  };

  const saveAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitExam = () => {
    // API call to submit answers
    setCurrentExam(null);
    setAnswers({});
  };

  return (
    <ExamContext.Provider value={{ exams, currentExam, answers, startExam, saveAnswer, submitExam }}>
      {children}
    </ExamContext.Provider>
  );
};
