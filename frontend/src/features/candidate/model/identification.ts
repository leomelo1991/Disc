import { z } from 'zod';
import { candidateSchema } from '@disc/contracts';
import { normalizePhone } from '../../../shared/lib/phone';

const today = () => new Date().toISOString().slice(0, 10);

/** Formulário: aceita telefone com máscara e normaliza para E.164 na validação. */
export const identificationSchema = candidateSchema.extend({
  phone: z.string().transform(normalizePhone).pipe(candidateSchema.shape.phone),
  birthDate: candidateSchema.shape.birthDate.refine((d) => d <= today() && d >= '1900-01-01', 'Data inválida'),
});

export type IdentificationInput = z.input<typeof identificationSchema>;
export type IdentificationOutput = z.output<typeof identificationSchema>;

export const EMPTY_IDENTIFICATION: IdentificationInput = {
  name: '',
  phone: '',
  email: '',
  jobTitle: '',
  department: '',
  birthDate: '',
};
