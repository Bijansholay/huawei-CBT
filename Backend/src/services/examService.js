import supabase from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create exam session
 */
export const createExamSession = async (userId, pdfId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .insert({
            id: uuidv4(),
            user_id: userId,
            pdf_id: pdfId,
            status: 'active',
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Get exam session
 */
export const getExamSession = async (examId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', examId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Submit exam answers
 */
export const submitAnswers = async (examId, answers) => {
    const answerRecords = answers.map(ans => ({
        id: uuidv4(),
        exam_id: examId,
        question_id: ans.question_id,
        user_answer: ans.user_answer
    }));

    const { data, error } = await supabase
        .from('exam_answers')
        .insert(answerRecords)
        .select();

    if (error) throw error;
    return data;
};

/**
 * Calculate score
 */
export const calculateScore = async (examId) => {
    // Get exam answers
    const { data: answers, error: answerError } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('exam_id', examId);

    if (answerError) throw answerError;

    // Get correct answers
    const { data: questions, error: questionError } = await supabase
        .from('questions')
        .select('id, correct_answer')
        .in('id', answers.map(a => a.question_id));

    if (questionError) throw questionError;

    // Calculate score
    const questionMap = questions.reduce((acc, q) => {
        acc[q.id] = q.correct_answer;
        return acc;
    }, {});

    let correctCount = 0;
    answers.forEach(answer => {
        if (questionMap[answer.question_id] === answer.user_answer) {
            correctCount++;
        }
    });

    const score = Math.round((correctCount / answers.length) * 100);
    const totalQuestions = answers.length;

    // Update exam session with score
    const { error: updateError } = await supabase
        .from('exam_sessions')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            score,
            total_questions: totalQuestions
        })
        .eq('id', examId);

    if (updateError) throw updateError;

    return {
        score,
        totalQuestions,
        correctCount,
        percentage: score
    };
};

/**
 * Get exam results
 */
export const getExamResults = async (examId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', examId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Get user's exam history
 */
export const getUserExamHistory = async (userId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};