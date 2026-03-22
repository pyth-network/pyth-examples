import { type FormEvent, useMemo, useState } from 'react';
import type { CreateRequestPayload } from '../types/payment';
import { formatAda } from '../utils/format';
import { computeLockAda } from '../utils/settlement';

interface RequestFormProps {
  adaUsd: number;
  coverageMultiplier: number;
  onCreate: (payload: CreateRequestPayload) => Promise<void>;
  isCreating: boolean;
  className?: string;
}

export function RequestForm({
  adaUsd,
  coverageMultiplier,
  onCreate,
  isCreating,
  className,
}: RequestFormProps): JSX.Element {
  const [usdAmount, setUsdAmount] = useState('120');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  });
  const [error, setError] = useState('');

  const estimatedLockAda = useMemo(() => {
    const amount = Number(usdAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      return 0;
    }
    return computeLockAda(amount, adaUsd, coverageMultiplier);
  }, [adaUsd, coverageMultiplier, usdAmount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const amount = Number(usdAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('USD amount must be greater than zero.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    setError('');
    try {
      await onCreate({
        usdAmount: amount,
        description: description.trim(),
        dueDate,
      });
      setDescription('');
      setUsdAmount('120');
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Could not create request right now.',
      );
    }
  };

  return (
    <section className={`panel request-form-panel ${className ?? ''}`.trim()}>
      <header className="panel__header">
        <div className="panel__header-stack">
          <h2>Create Request</h2>
        </div>
      </header>
      <form className="request-form" onSubmit={handleSubmit}>
        <label>
          USD amount
          <input
            type="number"
            // min="1"
            step="1"
            value={usdAmount}
            disabled={isCreating}
            onChange={(event) => setUsdAmount(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            rows={3}
            value={description}
            placeholder="What are you charging for?"
            disabled={isCreating}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            min={new Date().toISOString().slice(0, 10)}
            disabled={isCreating}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <div className="estimate-block">
          <span>Estimated lock</span>
          <strong>{formatAda(estimatedLockAda)}</strong>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="button button--primary" type="submit" disabled={isCreating}>
          {isCreating ? 'Creating lock transaction...' : 'Create & Auto-Fund'}
        </button>
      </form>
    </section>
  );
}
