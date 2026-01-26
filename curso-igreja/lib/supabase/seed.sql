-- Seed inicial - Criar usuário admin

-- Execute este script no SQL Editor do Supabase após executar o schema.sql

-- Inserir usuário administrador
-- Email: admin@capacitacao.com
-- Senha: admin
-- Hash bcrypt da senha "admin": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

INSERT INTO users (email, password_hash, nome, role)
VALUES (
  'admin@capacitacao.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Administrador',
  'admin'
);
