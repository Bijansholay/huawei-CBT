import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const STORAGE_BUCKET = 'pdfs';

/**
 * Initialize storage bucket
 */
export const initializeStorage = async () => {
    try {
        await supabase.storage.createBucket(STORAGE_BUCKET, {
            public: false,
            allowedMimeTypes: ['application/pdf'],
            fileSizeLimit: 10485760 // 10MB
        });
        console.log('Storage bucket initialized');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('Storage bucket already exists');
        } else {
            throw error;
        }
    }
};

/**
 * Upload PDF to Supabase Storage
 */
export const uploadPDF = async (file, filename) => {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(`${Date.now()}-${filename}`, file.buffer, {
            contentType: 'application/pdf',
            upsert: false
        });

    if (error) throw error;
    return data.path;
};

/**
 * Get signed URL for PDF
 */
export const getPDFSignedUrl = async (filePath) => {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
};

/**
 * Delete PDF from storage
 */
export const deletePDF = async (filePath) => {
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

    if (error) throw error;
};

export default supabase;