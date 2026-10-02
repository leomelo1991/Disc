// Ambiente comum das suítes do backend. DATABASE_URL = dono (fixtures, ignora RLS); APP_DATABASE_URL = papel da API (RLS).
export const testEnv = {
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test',
  APP_DATABASE_URL: process.env.TEST_APP_DATABASE_URL ?? 'postgres://disc_app:disc_app@localhost:5432/disc_test',
  PRESENTATION_DAILY_LIMIT: '100000', // testes criam muitas empresas; o teste do limite define o próprio valor
  NODE_ENV: 'test',
};
