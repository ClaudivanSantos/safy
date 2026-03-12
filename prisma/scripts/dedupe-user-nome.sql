-- Remove duplicatas de nome na tabela User: mantém o primeiro (por created_at, id)
-- e altera os demais para nome + sufixo único.
UPDATE "User" u
SET nome = u.nome || '_' || REPLACE(SUBSTRING(u.id::text FROM 1 FOR 8), '-', '')
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY nome ORDER BY "created_at", id) AS rn
  FROM "User"
) AS dup
WHERE u.id = dup.id AND dup.rn > 1;
