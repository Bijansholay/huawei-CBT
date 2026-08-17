-- Migration to add missing columns to match schema.sql and store.js expectations
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE exam_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE exam_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE exam_violations ADD COLUMN IF NOT EXISTS high_resolution_timestamp DOUBLE PRECISION;
