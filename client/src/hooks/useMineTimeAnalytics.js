import {getApiErrorMessage} from '../utils/apiErrorMessage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {useTranslation} from '../i18n/I18nProvider';
import axios from 'axios';
import { getMineAnalyticsPeriod } from '../utils/mineTimeAnalytics';

export default function useMineTimeAnalytics({ selectedWeek, range, currentUser, selectedUserId, scope = 'mine', clientType = '', revision = 0 }) {
  const {t}=useTranslation();
  const period = useMemo(() => getMineAnalyticsPeriod(selectedWeek, range), [range, selectedWeek]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!currentUser?.id || (scope === 'mine' && currentUser.role === 'admin' && !selectedUserId)) return undefined;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    const params = { scope, ...period };
    if (scope === 'mine' && selectedUserId) params.userId = selectedUserId;
    if (clientType) params.clientType = clientType;

    axios.get('/api/dashboard', { params })
      .then((response) => {
        if (requestId === requestRef.current) setData(response.data);
      })
      .catch((requestError) => {
        if (requestId !== requestRef.current) return;
        setError(getApiErrorMessage(requestError,t,'mineAnalytics.error'));
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });

    return () => {
      if (requestId === requestRef.current) requestRef.current += 1;
    };
  }, [clientType, currentUser, period, reloadToken, revision, scope, selectedUserId,t]);

  return { data, loading, error, period, reload };
}
