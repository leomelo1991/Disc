import { Button } from '../../../shared/ui';
import { isGroupComplete, isRankDisabled, RANK_VALUES, setRank, type Ranks } from '../model/ranking';

interface Props {
  index: number;
  total: number;
  group: { id: string; options: Array<{ id: string; label: string }> };
  ranks: Ranks;
  onRanks: (r: Ranks) => void;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuestionGroup({ index, total, group, ranks, onRanks, onPrev, onNext, isLast }: Props) {
  const ids = group.options.map((o) => o.id);
  const complete = isGroupComplete(ids, ranks);

  return (
    <section aria-labelledby="q-title" className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>
            Pergunta {index + 1} de {total}
          </span>
          <span>{Math.round((index / total) * 100)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso do teste"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index}
          className="h-2 overflow-hidden rounded-full bg-slate-200"
        >
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(index / total) * 100}%` }} />
        </div>
      </div>

      <h2 id="q-title" className="text-lg font-semibold">
        Dê uma nota a cada palavra
      </h2>
      <p className="text-sm text-slate-600">
        <strong>4</strong> = mais parecido com você · <strong>1</strong> = menos parecido. Use cada nota uma única vez.
      </p>

      <div className="space-y-3">
        {group.options.map((o) => (
          <div key={o.id} role="group" aria-label={o.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 font-medium">{o.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {RANK_VALUES.map((v) => {
                const selected = ranks[o.id] === v;
                const disabled = isRankDisabled(ids, ranks, o.id, v);
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${o.label}: nota ${v}`}
                    disabled={disabled}
                    onClick={() => onRanks(setRank(ids, ranks, o.id, v))}
                    className={`min-h-11 rounded-lg border text-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-indigo-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onPrev}>
          Voltar
        </Button>
        <Button type="button" className="flex-1" disabled={!complete} onClick={onNext}>
          {isLast ? 'Revisar respostas' : 'Próxima'}
        </Button>
      </div>
    </section>
  );
}
