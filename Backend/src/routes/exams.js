import express from 'express';
import {
    startExamController,
    getExamController,
    submitExamController,
    getExamResultsController,
    getUserExamsController
} from '../controllers/examController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/exams/start - Start exam session
 */
router.post('/start', asyncHandler(startExamController));

/**
 * GET /api/exams/user/:userId - Get user's exam history
 */
router.get('/user/:userId', asyncHandler(getUserExamsController));

/**
 * GET /api/exams/:examId - Get exam details
 */
router.get('/:examId', asyncHandler(getExamController));

/**
 * POST /api/exams/:examId/submit - Submit exam answers
 */
router.post('/:examId/submit', asyncHandler(submitExamController));

/**
 * GET /api/exams/:examId/results - Get exam results
 */
router.get('/:examId/results', asyncHandler(getExamResultsController));

export default router;