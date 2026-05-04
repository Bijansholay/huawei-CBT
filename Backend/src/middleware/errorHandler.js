import { errorResponse } from '../utils/responses.js';

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'FILE_TOO_LARGE') {
            return errorResponse(res, { message: 'File too large' }, 413);
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return errorResponse(res, { message: 'Too many files' }, 400);
        }
    }

    // 404 handler
    if (err.status === 404) {
        return errorResponse(res, { message: 'Not found' }, 404);
    }

    // Default error
    errorResponse(res, err, 500);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
    errorResponse(res, { message: `Route not found: ${req.method} ${req.path}` }, 404);
};