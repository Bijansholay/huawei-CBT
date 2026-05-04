import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
}

// Use service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Initialize database tables
 * Run once during deployment
 */
export const initializeDatabase = async () => {
    try {
        // PDFs table
        const { error: pdfError } = await supabase.rpc('exec', {
            sql: `
        CREATE TABLE IF NOT EXISTS pdfs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          filename VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          file_size INTEGER,
          extracted_text TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_pdfs_status ON pdfs(status);
      `
        });

        // Questions table
        const { error: questionError } = await supabase.rpc('exec', {
            sql: `
        CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          options JSONB NOT NULL,
          correct_answer VARCHAR(10),
          difficulty VARCHAR(20) DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (pdf_id) REFERENCES pdfs(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_questions_pdf_id ON questions(pdf_id);
      `
        });

        // Exam sessions table
        const { error: examError } = await supabase.rpc('exec', {
            sql: `
        CREATE TABLE IF NOT EXISTS exam_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'active',
          started_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP,
          score INTEGER,
          total_questions INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (pdf_id) REFERENCES pdfs(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON exam_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_exam_sessions_pdf ON exam_sessions(pdf_id);
      `
        });

        // Exam answers table
        const { error: answerError } = await supabase.rpc('exec', {
            sql: `
        CREATE TABLE IF NOT EXISTS exam_answers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          exam_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          user_answer VARCHAR(10),
          is_correct BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (exam_id) REFERENCES exam_sessions(id),
          FOREIGN KEY (question_id) REFERENCES questions(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_exam_answers_exam ON exam_answers(exam_id);
      `
        });

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

export default supabase;