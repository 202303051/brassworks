import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fieldClass, number } from './ui';
import { SPECTRO_ELEMENTS } from './spectro-parser';
import { recognizeSpectroPhoto, validateSpectroPhoto } from './spectro-ocr';
import { zincBalance } from './model';

export default function SpectroPhotoScan({ form, onApply }) {
  const upload = useRef(null);
  const camera = useRef(null);
  const controller = useRef(null);
  const sequence = useRef(0);
  const preview = useRef(null);
  const original = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState({});
  const [selected, setSelected] = useState({});
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(0);

  useEffect(
    () => () => {
      sequence.current += 1;
      controller.current?.abort();
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );

  async function scan(file) {
    if (!file) return;
    try {
      validateSpectroPhoto(file);
    } catch (failure) {
      setError(failure.message);
      return;
    }
    controller.current?.abort();
    const current = ++sequence.current;
    controller.current = new window.AbortController();
    original.current = file;
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = URL.createObjectURL(file);
    setPhoto({ url: preview.current, name: file.name });
    setBusy(true);
    setProgress(0);
    setResult(null);
    setApplied(0);
    setError('');
    try {
      const reading = await recognizeSpectroPhoto(file, {
        signal: controller.current.signal,
        onProgress: (value) => {
          if (sequence.current === current) setProgress(value);
        },
      });
      if (sequence.current !== current) return;
      setResult(reading);
      setDraft(
        Object.fromEntries(
          Object.entries(reading.values).map(([key, value]) => [key, String(value)]),
        ),
      );
      setSelected(Object.fromEntries(Object.keys(reading.values).map((key) => [key, true])));
    } catch (failure) {
      if (sequence.current === current)
        setError(failure.message || 'Could not read this photo. Try a clearer image.');
    } finally {
      if (sequence.current === current) setBusy(false);
    }
  }

  function cancel() {
    sequence.current += 1;
    controller.current?.abort();
    setBusy(false);
    setError('Scan cancelled. Your form values have not changed.');
  }

  const chosen = Object.fromEntries(
    SPECTRO_ELEMENTS.filter(([key]) => selected[key]).map(([key]) => [key, Number(draft[key])]),
  );
  const invalid = Object.keys(chosen).some(
    (key) =>
      !draft[key]?.trim() || !Number.isFinite(chosen[key]) || chosen[key] < 0 || chosen[key] > 100,
  );
  const merged = { ...form, ...chosen };
  if (!Object.hasOwn(chosen, 'zn') && form.autoZn) merged.zn = zincBalance(merged);
  const total = SPECTRO_ELEMENTS.reduce((sum, [key]) => sum + Number(merged[key] || 0), 0);
  const totalInvalid = !Number.isFinite(total) || total > 100.000001 || Number(merged.zn) < 0;
  const count = Object.keys(chosen).length;

  return (
    <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Scan spectro photo</h3>
          <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            Take or upload a clear photo of the result table. Review the detected percentages before
            applying.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            disabled={busy}
            onClick={() => camera.current.click()}
          >
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            disabled={busy}
            onClick={() => upload.current.click()}
          >
            Upload photo
          </Button>
        </div>
      </div>
      <input
        ref={camera}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Take spectro photo"
        onChange={(event) => {
          scan(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={upload}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload spectro photo"
        onChange={(event) => {
          scan(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        Processed on this device. The photo is not uploaded or saved with the heat. Crop to the
        composition table for the clearest result.
      </p>
      {photo && (
        <div className="mt-3 flex items-start gap-3 rounded-md border border-border bg-card p-2">
          <img
            src={photo.url}
            alt="Selected spectro results"
            className="h-24 w-24 shrink-0 rounded object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs font-semibold">{photo.name}</p>
            {busy ? (
              <div role="status" aria-live="polite">
                <p className="mt-2 text-xs">
                  {progress ? `Reading results… ${progress}%` : 'Preparing photo reader…'}
                </p>
                <progress
                  max="100"
                  value={progress || undefined}
                  className="mt-2 h-2 w-full accent-primary"
                  aria-label="Photo scan progress"
                />
                <Button type="button" variant="ghost" className="mt-1 min-h-12" onClick={cancel}>
                  Cancel scan
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="min-h-12"
                onClick={() => scan(original.current)}
              >
                Scan again
              </Button>
            )}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="text-sm font-bold">Review detected values</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Compare every checked value with the photo. Unchecked fields keep their current values;
            applying does not save the heat.
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-warning">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPECTRO_ELEMENTS.map(([key, symbol]) => (
              <div key={key} className="rounded-md border border-border bg-card p-2">
                <label className="flex min-h-12 items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    className="size-4"
                    aria-label={'Use ' + symbol + ' reading'}
                    checked={Boolean(selected[key])}
                    disabled={!draft[key]?.trim()}
                    onChange={(event) =>
                      setSelected((current) => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                  {symbol} (%)
                </label>
                <input
                  className={fieldClass}
                  aria-label={'Detected ' + symbol + ' (%)'}
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Not read"
                  value={draft[key] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, [key]: value }));
                    setSelected((current) => ({ ...current, [key]: value !== '' }));
                  }}
                />
                {result.candidates[key].length > 1 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Readings: {result.candidates[key].join(', ')}%
                  </p>
                )}
              </div>
            ))}
          </div>
          <p
            className={
              'mt-3 text-xs font-semibold ' +
              (invalid || totalInvalid ? 'text-destructive' : 'text-muted-foreground')
            }
          >
            Combined spectro total: {number(total, 4)}%
            {invalid || totalInvalid
              ? '. Check the selected readings and existing fields; all percentages must be valid and the total cannot exceed 100%.'
              : ''}
          </p>
          <Button
            type="button"
            className="mt-3 min-h-12 w-full sm:w-auto"
            disabled={!count || invalid || totalInvalid}
            onClick={() => {
              onApply(chosen);
              setApplied(count);
              setResult(null);
            }}
          >
            Apply {count} value{count === 1 ? '' : 's'} to spectro
          </Button>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="flex min-h-12 cursor-pointer items-center underline">
              Show detected text
            </summary>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3">
              {result.text.slice(0, 20000)}
            </pre>
          </details>
        </div>
      )}
      {applied > 0 && (
        <p role="status" className="mt-3 text-xs font-semibold text-success">
          Applied {applied} readings. Review the spectro fields below, then save the heat when
          ready.
        </p>
      )}
    </div>
  );
}
