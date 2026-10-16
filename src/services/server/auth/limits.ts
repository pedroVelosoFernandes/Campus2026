import { createAuthLimits } from './handlers';

/**
 * Limites compartilhados pelas rotas /api/auth/* (mesmo processo), para que
 * o limite por número valha entre envio e conferência do código.
 */
export const authLimits = createAuthLimits();
