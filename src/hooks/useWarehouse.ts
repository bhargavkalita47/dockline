import { useCallback, useEffect, useRef, useState } from 'react';
import type { WarehouseCommand, WarehouseState } from '../domain/types';
import { applyCommand } from '../domain/engine';
import { repository } from '../services/repository';

export function useWarehouse() {
  const [state, setState] = useState<WarehouseState | null>(null);
  const current = useRef<WarehouseState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { repository.load().then(s => { current.current = s; setState(s); }).catch(e => setError(String(e instanceof Error ? e.message : e))); }, []);
  const dispatch = useCallback(async (cmd: WarehouseCommand): Promise<boolean> => {
    if (!current.current || inFlight.current) return false;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const next = applyCommand(current.current, cmd);
      await repository.save(next);
      current.current = next; setState(next);
      return true;
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not complete this action.'); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }, []);
  const reset = useCallback(async () => {
    setBusy(true); setError('');
    try { const next = await repository.reset(); current.current = next; setState(next); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Reset failed.'); return false; }
    finally { setBusy(false); }
  }, []);
  return { state, error, clearError: () => setError(''), busy, dispatch, reset };
}
