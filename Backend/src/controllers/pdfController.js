import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/database.js';
import { uploadPDF } from '../config/supabase.js';
import { extractTextFromPDF } from '../services/pdfService.js';
import { validatePDFUpload } from '../services/validationService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/responses.js';

/**
 * Upload PDF and extract text
 * POST /api/pdf/upload
 */
export const uploadPDFController = async (req, res) => {
    try {
        if (!req.file) {
            return validationErrorResponse(res, { file: 'File is required' });
        }

        // Validate file
        const { error, value } = validatePDFUpload(req.file);
        if (error) {
            return validationErrorResponse(res, { file: error.details[0].message });
        }

        // Upload to storage
        const filePath = await uploadPDF(req.file, value.originalname);

        // Extract text
        const { text, numPages, numWords } = await extractTextFromPDF(req.file.buffer);

        // Save to database
        const pdfId = uuidv4();
        const { data, error: dbError } = await supabase
            .from('pdfs')
            .insert({
                id: pdfId,
                filename: value.originalname,
                file_path: filePath,
                file_size: value.size,
                extracted_text: text,
                status: 'processed'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return successResponse(res, {
            id: data.id,
            filename: data.filename,
            file_size: data.file_size,
            num_pages: numPages,
            num_words: numWords,
            status: data.status,
            created_at: data.created_at
        }, 'PDF uploaded and processed successfully', 201);

    } catch (error) {
        console.error('PDF upload error:', error);
        return errorResponse(res, error, 500);
    }
};

/**
 * Get PDF details
 * GET /api/pdf/:id
 */
export const getPDFController = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('pdfs')
            .select('id, filename, file_size, status, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error || !data) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        return successResponse(res, data);
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};

/**
 * List all PDFs
 * GET /api/pdf
 */
export const listPDFsController = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error } = await supabase
            .from('pdfs')
            .select('id, filename, file_size, status, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { count } = await supabase
            .from('pdfs')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return successResponse(res, {
            pdfs: data,
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

/**
 * Delete PDF
 * DELETE /api/pdf/:id
 */
export const deletePDFController = async (req, res) => {
    try {
        const { id } = req.params;

        // Get PDF record
        const { data: pdf, error: fetchError } = await supabase
            .from('pdfs')
            .select('file_path')
            .eq('id', id)
            .single();

        if (fetchError || !pdf) {
            return errorResponse(res, { message: 'PDF not found' }, 404);
        }

        // Delete from storage
        await supabase.storage
            .from('pdfs')
            .remove([pdf.file_path]);

        // Delete from database (cascading deletes questions and exam sessions)
        const { error: deleteError } = await supabase
            .from('pdfs')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return successResponse(res, { id }, 'PDF deleted successfully');
    } catch (error) {
        return errorResponse(res, error, 500);
    }
};