-- O empate agora é derivado das pontuações na leitura (limite de 5 pontos percentuais, antes 3),
-- junto com o código do perfil combinado. Uma coluna gravada ficaria desatualizada a cada ajuste do limite.
ALTER TABLE "profile_result" DROP COLUMN "tied";
