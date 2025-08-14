import { SessionSummary, ApiSessionResponse } from '@/types/session';

const API_BASE_URL = 'https://tryme.tendry.net:8080';

export async function getSessions(): Promise<SessionSummary[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('API Response for /api/v1/sessions:', data);
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.sessions)) {
      return data.sessions;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn('Unexpected sessions data format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

export async function getCompleteSession(sessionId: string): Promise<ApiSessionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/complete`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session ${sessionId}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching session ${sessionId}:`, error);
    throw error;
  }
}