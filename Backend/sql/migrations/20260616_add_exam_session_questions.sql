-- Migration: add session-question mapping and helper function
-- filepath: Backend/sql/migrations/20260616_add_exam_session_questions.sql

-- Create session-specific question mapping table
CREATE TABLE IF NOT EXISTS exam_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_session_questions_session ON exam_session_questions(session_id);

-- Helper function: create an exam session and populate it with a shuffled subset
-- equal to exams.total_questions. Returns the new session id.
CREATE OR REPLACE FUNCTION create_exam_session_and_populate(p_exam_id UUID, p_student_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_total INTEGER;
  v_session_id UUID;
BEGIN
  SELECT total_questions INTO v_total FROM exams WHERE id = p_exam_id;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Exam not found: %', p_exam_id;
  END IF;

  INSERT INTO exam_sessions (exam_id, student_id, status, started_at, total_questions)
  VALUES (p_exam_id, p_student_id, 'active', NOW(), v_total)
  RETURNING id INTO v_session_id;

  INSERT INTO exam_session_questions (session_id, question_id, question_order)
  SELECT v_session_id, q.id, ROW_NUMBER() OVER (ORDER BY random())
  FROM (
    SELECT id FROM questions WHERE exam_id = p_exam_id ORDER BY random() LIMIT v_total
  ) q;

  RETURN v_session_id;
END;
$$;
