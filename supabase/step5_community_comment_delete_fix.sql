begin;

-- PostgreSQL needs a SELECT policy to identify rows before an authenticated
-- DELETE can affect them. Comment bodies are still read by the filtered
-- get_publication_comments RPC; this policy only exposes the caller's rows
-- through the table API and makes owner deletion effective.
drop policy if exists comments_select_own on public.publication_comments;
create policy comments_select_own
  on public.publication_comments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists comments_delete_own on public.publication_comments;
create policy comments_delete_own
  on public.publication_comments
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;
