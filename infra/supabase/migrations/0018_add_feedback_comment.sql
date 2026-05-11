-- Add optional free-text comment to feedback
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS comment TEXT;
