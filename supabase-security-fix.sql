-- ============================================================
-- ClassBack — Security Fix (Recursion)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Fix the recursion in class_members
DROP POLICY IF EXISTS "Allow members and admins to see list" ON public.class_members;

CREATE POLICY "Users can view their own membership" ON public.class_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view class member list" ON public.class_members
  FOR SELECT USING (
    auth.uid() = (SELECT admin_id FROM public.classes WHERE id = class_id)
  );

-- Fix the policy for messages to be more efficient and clear
DROP POLICY IF EXISTS "Members and admins can view messages" ON public.messages;
CREATE POLICY "Members and admins can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_members m
      WHERE m.user_id = auth.uid() AND m.class_id = (SELECT class_id FROM public.spaces WHERE id = messages.space_id)
    ) OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.admin_id = auth.uid() AND c.id = (SELECT class_id FROM public.spaces WHERE id = messages.space_id)
    )
  );

-- Fix insert policy for messages
DROP POLICY IF EXISTS "Members and admins can send messages" ON public.messages;
CREATE POLICY "Members and admins can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_members m
      WHERE m.user_id = auth.uid() AND m.class_id = (SELECT class_id FROM public.spaces WHERE id = space_id)
    ) OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.admin_id = auth.uid() AND c.id = (SELECT class_id FROM public.spaces WHERE id = space_id)
    )
  );
