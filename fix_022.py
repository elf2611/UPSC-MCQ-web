with open("migrations/022_doubt_solving.sql", "r") as f:
    c = f.read()

# Remove the RLS policies referencing auth.uid()
c = c.replace("""CREATE POLICY "Users can view their own doubt threads"
  ON doubt_threads
  FOR SELECT
  USING (user_id = auth.uid());""", "")

c = c.replace("""CREATE POLICY "Users can insert their own doubt threads"
  ON doubt_threads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());""", "")

c = c.replace("""CREATE POLICY "Users can view messages in their threads"
  ON doubt_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doubt_threads 
      WHERE doubt_threads.id = doubt_messages.thread_id 
      AND doubt_threads.user_id = auth.uid()
    )
  );""", "")

c = c.replace("""CREATE POLICY "Users can insert messages in their threads"
  ON doubt_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doubt_threads 
      WHERE doubt_threads.id = doubt_messages.thread_id 
      AND doubt_threads.user_id = auth.uid()
    )
  );""", "")

with open("migrations/022_doubt_solving.sql", "w") as f:
    f.write(c)
