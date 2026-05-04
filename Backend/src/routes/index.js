import express from 'express';
import pdfRoutes from './pdf.js';
import questionRoutes from './questions.js';
import examRoutes from './exams.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/pdf', pdfRoutes);
router.use('/questions', questionRoutes);
router.use('/exams', examRoutes);

export default router;