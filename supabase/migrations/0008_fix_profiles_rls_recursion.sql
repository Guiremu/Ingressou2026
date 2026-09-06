-- Corrige recursão infinita ao ler o próprio perfil (erro 42P17). A política
-- "profiles: admin lê todos os perfis" fazia uma subquery na própria tabela
-- profiles para checar o papel do usuário, o que reaciona a avaliação das
-- políticas de RLS de profiles recursivamente. A função current_role_v() já
-- existe (security definer, bypassa RLS) exatamente para evitar isso — só não
-- tinha sido usada nesta política.
drop policy if exists "profiles: admin lê todos os perfis" on public.profiles;

create policy "profiles: admin lê todos os perfis"
  on public.profiles for select
  using (public.current_role_v() = 'admin');

-- Mesmo problema na política de update (impedir que o usuário troque o próprio
-- papel): a subquery em profiles dentro do "with check" também recursava.
drop policy if exists "profiles: usuário atualiza o próprio perfil" on public.profiles;

create policy "profiles: usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_role_v());
