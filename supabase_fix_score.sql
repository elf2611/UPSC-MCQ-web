-- Change score column to accept decimal values
ALTER TABLE test_attempts 
  ALTER COLUMN score TYPE NUMERIC;

-- Force the schema cache to reload
NOTIFY pgrst, 'reload schema';
