-- ============================================================
-- ClassBack — Security Hardening (RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- First, drop old permissive policies to start fresh
DROP POLICY IF EXISTS "Spaces are viewable" ON public.spaces;
DROP POLICY IF EXISTS "Admin can manage spaces" ON public.spaces;
DROP POLICY IF EXISTS "Members viewable" ON public.class_members;
DROP POLICY IF EXISTS "Messages are viewable" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Classes are viewable" ON public.classes;

-- 1. CLASSES
CREATE POLICY "Authenticated users can see classes" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. SPACES
CREATE POLICY "Members and admins can view spaces" ON public.spaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_id = spaces.class_id AND user_id = auth.uid()
    ) OR 
    (SELECT admin_id FROM public.classes WHERE id = spaces.class_id) = auth.uid()
  );

CREATE POLICY "Only admins can manage spaces" ON public.spaces
  FOR ALL USING (
    (SELECT admin_id FROM public.classes WHERE id = spaces.class_id) = auth.uid()
  );

-- 3. CLASS_MEMBERS
CREATE POLICY "Allow members and admins to see list" ON public.class_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_members sub 
      WHERE sub.class_id = class_members.class_id AND sub.user_id = auth.uid()
    ) OR
    (SELECT admin_id FROM public.classes WHERE id = class_members.class_id) = auth.uid()
  );

-- 4. MESSAGES
-- View messages only if you belong to the class
CREATE POLICY "Members and admins can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.spaces s
      JOIN public.class_members m ON s.class_id = m.class_id
      WHERE s.id = messages.space_id AND m.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.spaces s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = messages.space_id AND c.admin_id = auth.uid()
    )
  );

-- Send messages only if you belong to the class
CREATE POLICY "Members and admins can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.spaces s
      JOIN public.class_members m ON s.class_id = m.class_id
      WHERE s.id = space_id AND m.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.spaces s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = space_id AND c.admin_id = auth.uid()
    )
  );

-- DELETE: Only the admin of the CLASS can delete (as per your requirement)
CREATE POLICY "Only class admin can delete messages" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.spaces s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = messages.space_id AND c.admin_id = auth.uid()
    )
  );

-- 5. REALTIME (Ensure only authenticated)
-- (Already enabled via 'alter publication' in previous schema)
