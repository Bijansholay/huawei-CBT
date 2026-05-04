import supabase from '../config/database.js';
import {
    createExamSession,
    getExamSession,
    submitAnswers,
    calculateScore,
    getExamResults,
    getUserExamHistory
} from '../services/examService.js';
import { validateExamSession, validateAnswerSubmission } from '../services/validationService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/responses.js';

/**
 * Create exam session
 * POST /api/exams/start
 */
export const startExamController = async (req, res) => {
    try {
        const { user_id, pdf_id } = req.body;

        // Validate input
        const { error } = validateExamSession({ user_id, pdf_id });
        if (error) {
            return validationErrorResponse(res, { field: error.details[0].message });
        }

        // Verify PDF exists and has questions
        const { data: pdf, error: pdfError } = await supabase
            .from('pdfs')
            .select('id')
            .eq('id', pdf_id)
            .single();

        if (pdfError || !pdf) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id')
            .eq('pdf_id', pdf_id);

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
            return errorResponse(res, { message: 'No questions available for this PDF' }, 400);
        }

        // Create exam session
        const examSession = await createExamSession(user_id, pdf_id);

        // Get questions without revealing correct answers
        const { data: examQuestions } = await supabase
            .from('questions')
            .select('id, question_text, options, difficulty')
            .eq('pdf_id', pdf_id)
            .order('id'); // Randomize question order in frontend

        return successResponse(res, {
            exam_id: examSession.id,
            user_id: examSession.user_id,
            pdf_id: examSession.pdf_id,
            status: examSession.status,
            total_questions: examQuestions.length,
            questions: examQuestions
        }, 'Exam session started', 201);

    } catch (error) {
        console.error('Exam start error:', error);
        return errorResponse(res, error, 500);
    }
};

/**
 * Get exam session details
 * GET /api/exams/:examId
 */
export const getExamController = async (req, res) => {
    try {
        const { examId } = req.params;

        const examSession = await getExamSession(examId);

        if (!examSession) {
            return errorResponse(res, { message: 'Exam not found' }, 404);
        }

        // Get questions if exam is still active
        let questions = null;
        if (examSession.status === 'active') {
            const { data } = await supabase
                .from('questions')
                .select('id, question_text, options, difficulty')
                .eq('pdf_id', examSession.pdf_id);
            questions = data;
        }

        return successResponse(res, {
            ...examSession,
            questions
        });
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};

/**
 * Submit exam answers
 * POST /api/exams/:examId/submit
 */
export const submitExamController = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers } = req.body;

        // Validate input
        const { error } = validateAnswerSubmission({ exam_id: examId, answers });
        if (error) {
            return validationErrorResponse(res, { field: error.details[0].message });
        }

        // Verify exam exists and is active
        const examSession = await getExamSession(examId);
        if (!examSession) {
            return errorResponse(res, { message: 'Exam not found' }, 404);
        }

        if (examSession.status !== 'active') {
            return errorResponse(res, { message: 'Exam is not active' }, 400);
        }

        // Submit answers
        await submitAnswers(examId, answers);

        // Calculate score
        const scoreResult = await calculateScore(examId);

        return successResponse(res, {
            exam_id: examId,
            score: scoreResult.score,
            percentage: scoreResult.percentage,
            correct_count: scoreResult.correctCount,
            total_questions: scoreResult.totalQuestions,
            status: 'completed'
        }, 'Exam submitted successfully');

    } catch (error) {
        console.error('Exam submission error:', error);
        return errorResponse(res, error, 500);
    }
};

/**
 * Get exam results
 * GET /api/exams/:examId/results
 */
export const getExamResultsController = async (req, res) => {
    try {
        const { examId } = req.params;

        const results = await getExamResults(examId);

        if (!results) {
            return errorResponse(res, { message: 'Exam not found' }, 404);
        }

        if (results.status !== 'completed') {
            return errorResponse(res, { message: 'Exam not completed yet' }, 400);
        }

        return successResponse(res, results);
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};

/**
 * Get user's exam history
 * GET /api/exams/user/:userId
 */
export const getUserExamsController = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const { data, error } = await supabase
            .from('exam_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        const { count, error: countError } = await supabase
            .from('exam_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error || countError) throw error || countError;

        return successResponse(res, {
            exams: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};