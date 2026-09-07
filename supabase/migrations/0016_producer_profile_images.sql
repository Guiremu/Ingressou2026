-- Bucket público pra logo/banner do perfil do produtor (mesmo padrão do event-images):
-- upload só acontece via Server Action com client de service role, então não
-- precisamos de policies de escrita em storage.objects — o bucket público já libera leitura.
insert into storage.buckets (id, name, public)
values ('producer-images', 'producer-images', true)
on conflict (id) do nothing;
