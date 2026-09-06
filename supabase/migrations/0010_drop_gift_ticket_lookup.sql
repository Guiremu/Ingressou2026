-- Reversão: ingressos comprados para outra pessoa não exigem que ela tenha
-- conta — o comprador exporta/compartilha o link do ingresso depois da
-- compra. A busca de destinatário por CPF (0009) não é mais necessária.
drop function if exists public.find_profile_by_cpf(text);
