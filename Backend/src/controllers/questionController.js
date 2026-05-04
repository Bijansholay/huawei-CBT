import supabase from '../config/database.js';
import { generateQuestions, validateQuestion } from '../services/aiService.js';
import { saveQuestions, getQuestionsByPdfId, getQuestionsWithPagination } from '../services/questionService.js';
import { validateQuestionGeneration } from '../services/validationService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/responses.js';

/**
 * Generate questions from PDF
 * POST /api/questions/generate
 */
export const generateQuestionsController = async (req, res) => {
    try {
        const { pdf_id, num_questions = 10, difficulty = 'medium' } = req.body;

        // Validate input
        const { error, value } = validateQuestionGeneration({
            pdf_id,
            num_questions,
            difficulty
        });

        if (error) {
            return validationErrorResponse(res, { field: error.details[0].message });
        }

        // Get PDF and extracted text
        const { data: pdf, error: pdfError } = await supabase
            .from('pdfs')
            .select('id, extracted_text')
            .eq('id', value.pdf_id)
            .single();

        if (pdfError || !pdf) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        if (!pdf.extracted_text) {
            return errorResponse(res, { message: 'PDF has no extractable text' }, 400);
        }

        // Generate questions using AI
        const generatedQuestions = await generateQuestions(
            pdf.extracted_text,
            value.num_questions,
            value.difficulty
        );

        // Validate generated questions
        const validQuestions = generatedQuestions.filter(validateQuestion);

        if (validQuestions.length === 0) {
            return errorResponse(res, { message: 'Failed to generate valid questions' }, 500);
        }

        // Save to database
        const savedQuestions = await saveQuestions(value.pdf_id, validQuestions);

        return successResponse(res, {
            generated: validQuestions.length,
            saved: savedQuestions.length,
            questions: savedQuestions
        }, 'Questions generated successfully', 201);

    } catch (error) {
        console.error('Question generation error:', error);
        return errorResponse(res, error, 500);
    }
};

/**
 * Get questions by PDF
 * GET /api/questions/pdf/:pdfId
 */
export const getQuestionsByPdfController = async (req, res) => {
    try {
        const { pdfId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Verify PDF exists
        const { data: pdf, error: pdfError } = await supabase
            .from('pdfs')
            .select('id')
            .eq('id', pdfId)
            .single();

        if (pdfError || !pdf) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        // Get questions
        const { questions, total } = await getQuestionsWithPagination(
            pdfId,
            parseInt(page),
            parseInt(limit)
        );

        return successResponse(res, {
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};

/**
 * Get single question
 * GET /api/questions/:questionId
 */
export const getQuestionController = async (req, res) => {
    try {
        const { questionId } = req.params;

        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();

        if (error || !data) {
            return errorResponse(res, { message: 'Question not found' }, 404);
        }

        return successResponse(res, data);
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};

/**
 * Delete all questions for a PDF
 * DELETE /api/questions/pdf/:pdfId
 */
export const deleteQuestionsController = async (req, res) => {
    try {
        const { pdfId } = req.params;

        // Verify PDF exists
        const { data: pdf, error: pdfError } = await supabase
            .from('pdfs')
            .select('id')
            .eq('id', pdfId)
            .single();

        if (pdfError || !pdf) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        // Delete questions
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('pdf_id', pdfId);

        if (error) throw error;

        return successResponse(res, { pdfId }, 'Questions deleted successfully');
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};