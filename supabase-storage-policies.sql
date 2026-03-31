-- ============================================================
-- ClassBack — Storage Security (Avatars)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure policies for 'classback-avatars' bucket
-- Allow users to upload their own avatar folder
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'classback-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'classback-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow everyone to see avatars (since bucket is public, but good to ensure)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'classback-avatars');

-- 2. Ensure policies for 'classback-images' bucket (for chat)
CREATE POLICY "Users can upload images to chat" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'classback-images'
  );

CREATE POLICY "Chat images are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'classback-images');
