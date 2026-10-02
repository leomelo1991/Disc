import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { maskPhone } from '../../../shared/lib/phone';
import { Button, Input } from '../../../shared/ui';
import {
  EMPTY_IDENTIFICATION,
  identificationSchema,
  type IdentificationInput,
  type IdentificationOutput,
} from '../model/identification';

interface Props {
  defaults: Partial<IdentificationInput>;
  onBack: () => void;
  onSubmit: (values: IdentificationInput) => void;
  onChange: (values: IdentificationInput) => void;
}

export function Identification({ defaults, onBack, onSubmit, onChange }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<IdentificationInput, unknown, IdentificationOutput>({
    resolver: zodResolver(identificationSchema),
    defaultValues: { ...EMPTY_IDENTIFICATION, ...defaults },
  });

  return (
    <form
      onSubmit={handleSubmit(() => onSubmit(getValues()))}
      onChange={() => onChange(getValues())}
      className="space-y-4"
      noValidate
    >
      <h2 className="text-xl font-semibold">Seus dados</h2>
      <Input label="Nome completo" autoComplete="name" {...register('name')} error={errors.name?.message} />
      <Input
        label="Telefone (WhatsApp)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 99999-8888"
        {...register('phone', { onChange: (e) => setValue('phone', maskPhone(e.target.value)) })}
        error={errors.phone?.message}
      />
      <Input
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        label="Cargo"
        autoComplete="organization-title"
        {...register('jobTitle')}
        error={errors.jobTitle?.message}
      />
      <Input label="Setor" {...register('department')} error={errors.department?.message} />
      <Input
        label="Data de nascimento"
        type="date"
        autoComplete="bday"
        {...register('birthDate')}
        error={errors.birthDate?.message}
      />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" className="flex-1">
          Começar o teste
        </Button>
      </div>
    </form>
  );
}
