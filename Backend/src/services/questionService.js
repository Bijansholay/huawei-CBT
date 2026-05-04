import supabase from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save questions to database
 */
export const saveQuestions = async (pdfId, questions) => {
    const questionRecords = questions.map(q => ({
        id: uuidv4(),
        pdf_id: pdfId,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correctAnswer,
        difficulty: q.difficulty || 'medium'
    }));

    const { data, error } = await supabase
        .from('questions')
        .insert(questionRecords)
        .select();

    if (error) throw error;
    return data;
};

/**
 * Get questions by PDF ID
 */
export const getQuestionsByPdfId = async (pdfId) => {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

/**
 * Get question by ID
 */
export const getQuestionById = async (questionId) => {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete questions by PDF ID
 */
export const deleteQuestionsByPdfId = async (pdfId) => {
    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('pdf_id', pdfId);

    if (error) throw error;
};

/**
 * Get questions with pagination
 */
export const getQuestionsWithPagination = async (pdfId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

    const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('pdf_id', pdfId);

    if (error || countError) throw error || countError;
    return { questions, total: count };
};