-- Corrige login que falhava quando o e-mail era digitado com maiúsculas (comum em teclados
-- de celular, que capitalizam a primeira letra de campos de texto genéricos). O e-mail é
-- sempre salvo em minúsculas no cadastro, mas a busca era sensível a maiúsculas/minúsculas.
create or replace function public.resolve_login_identifier(identifier text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from public.profiles
  where cpf = identifier or telefone = identifier or lower(email) = lower(identifier)
  limit 1;
$$;
