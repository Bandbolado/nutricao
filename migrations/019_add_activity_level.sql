-- Add activity_level to patients
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'sedentary';
