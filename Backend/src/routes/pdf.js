import express from 'express';
import multer from 'multer';
import {
    uploadPDFController,
    getPDFController,
    listPDFsController,
    deletePDFController
} from '../controllers/pdfController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for PDF upload
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

/**
 * POST /api/pdf/upload - Upload and process PDF
 */
router.post('/upload', upload.single('file'), asyncHandler(uploadPDFController));

/**
 * GET /api/pdf/:id - Get PDF details
 */
router.get('/:id', asyncHandler(getPDFController));

/**
 * GET /api/pdf - List all PDFs
 */
router.get('/', asyncHandler(listPDFsController));

/**
 * DELETE /api/pdf/:id - Delete PDF
 */
router.delete('/:id', asyncHandler(deletePDFController));

export default router;