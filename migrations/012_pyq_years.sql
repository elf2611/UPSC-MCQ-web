-- Create a function to get distinct years from the questions table
CREATE OR REPLACE FUNCTION get_distinct_years()
RETURNS TABLE (year INT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT year 
  FROM questions 
  WHERE year IS NOT NULL 
  ORDER BY year DESC;
$$;
