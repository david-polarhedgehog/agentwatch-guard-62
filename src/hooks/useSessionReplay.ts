import { useQuery } from '@tanstack/react-query';
import { getCompleteSession } from '@/lib/sessionApi';
import { ApiSessionResponse } from '@/types/session';

export const useSessionReplay = (sessionId: string) => {
  return useQuery<ApiSessionResponse>({
    queryKey: ['session-replay', sessionId],
    queryFn: () => getCompleteSession(sessionId),
    enabled: !!sessionId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};