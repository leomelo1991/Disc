import { render, screen, within } from '@testing-library/react';
import { buildProfile, candidateSummary } from '@disc/core';
import { describe, expect, it } from 'vitest';
import { Result } from './Result';

// 24 grupos: cada fator varia de 24 a 96. D e I no topo; a diferença bruta decide o empate.
const summaryFor = (d: number, i: number) => candidateSummary(buildProfile({ D: d, I: i, S: 50, C: 30 }, 24));

describe('Result (candidato)', () => {
  it('sem empate: mostra o perfil combinado, o principal e o secundário', () => {
    render(<Result company="Acme" summary={summaryFor(86, 66)} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perfil DI · Dominância com Influência');
    expect(screen.getByRole('heading', { name: 'Seu perfil combinado: DI' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perfil principal: Dominância' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perfil secundário: Influência' })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/mesmo peso do outro perfil/)).not.toBeInTheDocument();
  });

  it('com empate: avisa que os dois perfis pesam igual e cita os dois', () => {
    render(<Result company="Acme" summary={summaryFor(70, 69)} />);

    const note = screen.getByRole('note');
    expect(within(note).getByText(/Empate entre os dois perfis/)).toBeInTheDocument();
    expect(note).toHaveTextContent('Dominância (D)');
    expect(note).toHaveTextContent('Influência (I)');
    // as três leituras continuam presentes; os dois fatores são marcados como de mesmo peso
    expect(screen.getByRole('heading', { name: 'Seu perfil combinado: DI' })).toBeInTheDocument();
    expect(screen.getAllByText(/mesmo peso do outro perfil/)).toHaveLength(2);
  });

  it('a ordem muda a leitura: I na frente mostra ID', () => {
    render(<Result company="Acme" summary={summaryFor(60, 80)} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perfil ID · Influência com Dominância');
    expect(screen.getByRole('heading', { name: 'Perfil principal: Influência' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perfil secundário: Dominância' })).toBeInTheDocument();
  });

  it('não mostra nada que seja de recrutador', () => {
    render(<Result company="Acme" summary={summaryFor(70, 69)} />);
    for (const text of [/Perguntas/, /Pontos de atenção/, /Estilo de comunicação/, /Ambiente ideal/, /Motivadores/]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });
});
