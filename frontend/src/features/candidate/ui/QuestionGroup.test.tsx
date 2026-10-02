import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Ranks } from '../model/ranking';
import { QuestionGroup } from './QuestionGroup';

const group = {
  id: 'g1',
  options: [
    { id: 'a', label: 'Decidido' },
    { id: 'b', label: 'Entusiasmado' },
    { id: 'c', label: 'Paciente' },
    { id: 'd', label: 'Detalhista' },
  ],
};

function Harness({ onNext }: { onNext: () => void }) {
  const [ranks, setRanks] = useState<Ranks>({});
  return (
    <QuestionGroup
      index={0}
      total={24}
      group={group}
      ranks={ranks}
      onRanks={setRanks}
      onPrev={() => {}}
      onNext={onNext}
      isLast={false}
    />
  );
}

const btn = (label: string, n: number) => screen.getByRole('button', { name: `${label}: nota ${n}` });

describe('QuestionGroup', () => {
  it('desabilita nos demais o valor já usado e libera ao desmarcar', async () => {
    const user = userEvent.setup();
    render(<Harness onNext={() => {}} />);
    await user.click(btn('Decidido', 4));
    expect(btn('Entusiasmado', 4)).toBeDisabled();
    expect(btn('Decidido', 4)).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn('Decidido', 4));
    expect(btn('Entusiasmado', 4)).toBeEnabled();
  });

  it('só habilita "Próxima" com as 4 notas distintas', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Harness onNext={onNext} />);
    const next = screen.getByRole('button', { name: 'Próxima' });
    expect(next).toBeDisabled();
    for (const [i, o] of group.options.entries()) {
      await user.click(btn(o.label, i + 1));
      if (i < 3) expect(next).toBeDisabled();
    }
    expect(next).toBeEnabled();
    await user.click(next);
    expect(onNext).toHaveBeenCalledOnce();
  });
});
