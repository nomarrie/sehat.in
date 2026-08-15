CREATE INDEX chat_messages_session_idx
  ON public.chat_messages (session_id);

-- AI request metadata is server-only. Keep client access explicitly denied even
-- if a table grant is added accidentally in the future.
CREATE POLICY ai_requests_deny_client_access
ON public.ai_requests
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
