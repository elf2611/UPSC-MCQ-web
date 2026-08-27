with open("migrations/024_mains.sql", "r") as f:
    c = f.read()

c = c.replace("""CREATE POLICY "Users can manage their own mains answers"
  ON mains_answers
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());""", "")

with open("migrations/024_mains.sql", "w") as f:
    f.write(c)
