import express from 'express';
import {
    generateQuestionsController,
    getQuestionsByPdfController,
    getQuestionController,
    deleteQuestionsController
} from '../controllers/questionController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/questions/generate - Generate questions from PDF
 */
router.post('/generate', asyncHandler(generateQuestionsController));

/**
 * GET /api/questions/pdf/:pdfId - Get questions by PDF
 */
router.get('/pdf/:pdfId', asyncHandler(getQuestionsByPdfController));

/**
 * GET /api/questions/:questionId - Get single question
 */
router.get('/:questionId', asyncHandler(getQuestionController));

/**
 * DELETE /api/questions/pdf/:pdfId - Delete questions by PDF
 */
router.delete('/pdf/:pdfId', asyncHandler(deleteQuestionsController));

export default router;