UPDATE attempt_answers aa
SET is_correct = (
  aa.selected_option IS NOT NULL AND
  LOWER(TRIM(aa.selected_option)) = LOWER(TRIM(
    (SELECT correct_option FROM questions 
     WHERE id = aa.question_id)
  ))
)
WHERE aa.is_correct IS NULL;

-- Verify fix
SELECT 
  is_correct,
  COUNT(*) as count
FROM attempt_answers
GROUP BY is_correct;
