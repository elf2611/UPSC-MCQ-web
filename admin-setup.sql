-- Admin Role Setup Script
-- Prepwise UPSC MCQ Web

-- Instructions:
-- 1. Go to your Supabase project dashboard -> SQL Editor
-- 2. Open your Firebase project -> Authentication -> Users to find the UID of your desired admin user.
-- 3. Replace 'your_firebase_uid_here' in the script below with the actual UID.
-- 4. Run the script.

UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your_firebase_uid_here';
