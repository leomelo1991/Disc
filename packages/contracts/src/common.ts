import { z } from 'zod';

export const factorSchema = z.enum(['D', 'I', 'S', 'C']);

/** Reexporta o zod usado pelos contratos, para que quem estende/consome os schemas use a MESMA instância. */
export { z } from 'zod';
