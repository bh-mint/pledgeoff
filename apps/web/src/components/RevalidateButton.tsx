'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/auth-client';

interface RevalidateResult {
  oldScore: number | null;
  oldVerdict: string | null;
  newScore: number | null;
  newVerdict: string;
  scoreDiff: number | null;
}

interface Props {
  ideaId: string;
  signalAgedays: number;
  validationsLeft: number;
  currentScore: number | null;
  currentVerdict: string | null;
  onDone?: () => void;
}

type Phase = 'idle' | 'confirm' | 'loading' | 'done' | 'error';

export function RevalidateButton({
  ideaId,
  signalAgedays,
  validationsLeft,
  currentScore,
  currentVerdict,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RevalidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labelAge = signalAgedays === 1 ? '1 day old' : `${signalAgedays} days old`;
  const afterBalance = Math.max(validationsLeft - 1, 0);
  const isEmpty = validationsLeft <= 0;
  const isLow = validationsLeft > 0 && validationsLeft <= 2;

  // Escape closes confirm modal
  useEffect(() => {
    if (phase !== 'confirm') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPhase('idle'); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [phase]);

  async function handleConfirm() {
    if (isEmpty) return;
    setPhase('loading');
    setError(null);
    const token = await getAuthToken();
    if (!token) { setPhase('error'); setError('Not authenticated'); return; }
    const res = await fetch(`/api/v1/ideas/${ideaId}/revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setPhase('error'); setError('Re-validation failed. Please try again.'); return; }
    const json = await res.json() as { data: RevalidateResult };
    setResult(json.data);
    setPhase('done');
    onDone?.();
  }

  // ── Done / error inline states ──────────────────────────────────────────
  if (phase === 'done' && result) {
    const diff = result.scoreDiff !== null && result.scoreDiff !== 0
      ? (result.scoreDiff > 0 ? `+${result.scoreDiff}` : `${result.scoreDiff}`)
      : null;
    return (
      <span className="reval-result">
        ✓{' '}
        {diff
          ? `Score: ${result.oldScore ?? '?'} → ${result.newScore ?? '?'} (${diff})`
          : `Re-scanned · ${result.newVerdict}`}
      </span>
    );
  }

  if (phase === 'error') {
    return (
      <button onClick={() => setPhase('confirm')} className="reval-result reval-result-err">
        {error ?? 'Failed'} · Retry
      </button>
    );
  }

  // ── Trigger button ──────────────────────────────────────────────────────
  const triggerBtn = (
    <button
      className="btn-g reval-trigger"
      onClick={() => setPhase('confirm')}
      disabled={phase === 'loading'}
      aria-label={`Signals ${labelAge}. Open revalidation confirm.`}
    >
      {phase === 'loading' ? (
        <><span className="reval-spin" aria-hidden="true" />Scanning…</>
      ) : (
        <><span aria-hidden="true">↻</span>Signals {labelAge} · Revalidate</>
      )}
    </button>
  );

  if (phase === 'idle' || phase === 'loading') return triggerBtn;

  // ── Confirm modal ───────────────────────────────────────────────────────
  const boardRef = currentScore !== null && currentVerdict
    ? `${currentScore} / ${currentVerdict}`
    : 'current board';

  return (
    <>
      {triggerBtn}
      <div
        className="reval-scrim"
        onMouseDown={e => { if (e.target === e.currentTarget) setPhase('idle'); }}
      >
        <div className="reval-modal" role="dialog" aria-modal="true" aria-labelledby="rv-title">

          <div className="reval-hd">
            <span>Revalidation</span>
            <span className="reval-hd-r">
              <span className="reval-hd-hr">Consumes 1 validation</span>
              <button
                className="reval-close"
                onClick={() => setPhase('idle')}
                aria-label="Close"
              >✕</button>
            </span>
          </div>

          <div className="reval-body">
            <div className="reval-eyebrow"><span aria-hidden="true">↻</span>Confirm revalidation</div>
            <h2 className="reval-title" id="rv-title">This will consume 1 validation.</h2>
            <p className="reval-lede">
              Revalidation re-runs the full pipeline from scratch. The current board is
              overwritten with fresh signals — there&apos;s no undo, and the validation is
              spent whether the verdict moves or not.
            </p>

            {/* Balance ledger */}
            <div className="reval-ledger">
              <div className="reval-led-row">
                <span className="reval-led-k">Balance now</span>
                <span className="reval-led-v">{validationsLeft} remaining</span>
              </div>
              <div className="reval-led-row">
                <span className="reval-led-k">This run</span>
                <span className="reval-led-v reval-led-cost">− 1 validation</span>
              </div>
              <div className="reval-led-row">
                <span className="reval-led-k">After</span>
                <span className="reval-led-v reval-led-after">
                  <span className={`reval-led-n${afterBalance <= 2 ? ' low' : ''}`}>
                    {afterBalance}
                  </span>
                  <span className="reval-led-arrow">remaining this month</span>
                </span>
              </div>
            </div>

            {/* What revalidation does */}
            <div className="reval-changes-lbl">What revalidation does</div>
            <ul className="reval-changes">
              <li>
                <span className="reval-ch-mark" aria-hidden="true">→</span>
                <span className="reval-ch-txt">
                  Re-fetches all signals{' '}
                  <span>— sightings, citations, and scores pulled fresh</span>
                </span>
              </li>
              <li>
                <span className="reval-ch-mark" aria-hidden="true">→</span>
                <span className="reval-ch-txt">
                  Resets all tools to idle{' '}
                  <span>— prior tool outputs are cleared</span>
                </span>
              </li>
              <li>
                <span className="reval-ch-mark" aria-hidden="true">→</span>
                <span className="reval-ch-txt">
                  Refreshes Otto&apos;s context{' '}
                  <span>— the analyst re-reads from zero</span>
                </span>
              </li>
              <li>
                <span className="reval-ch-mark" aria-hidden="true">→</span>
                <span className="reval-ch-txt">
                  Overwrites this verdict board{' '}
                  <span>— the current {boardRef} is replaced</span>
                </span>
              </li>
            </ul>

            {/* Warning: low or empty */}
            {(isEmpty || isLow) && (
              <div className={`reval-warn${isEmpty ? ' empty' : ''}`}>
                <span className="reval-warn-gl" aria-hidden="true">▲</span>
                <span className="reval-warn-txt">
                  {isEmpty ? (
                    <><b>No validations left.</b> You can&apos;t revalidate until your balance refills — or add a validation pack to run now.</>
                  ) : (
                    <><b>Running low — {validationsLeft} left this month.</b> Spending one here leaves you {afterBalance}. Revalidate only if the signals have genuinely moved.</>
                  )}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="reval-acts">
              <button
                className="btn-p"
                onClick={handleConfirm}
                disabled={isEmpty}
              >
                {isEmpty ? 'Out of validations' : 'Confirm — run revalidation'}
              </button>
              <div className="reval-act2">
                <button className="reval-ghost" onClick={() => setPhase('idle')}>
                  Keep current verdict
                </button>
                <span className="reval-assure">Refills on the 1st · packs available anytime</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
