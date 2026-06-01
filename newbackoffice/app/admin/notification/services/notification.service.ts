const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface AudienceStat {
  role_id: number;
  label: string;
  with_token: number;
  total: number;
}

export interface PushSendResult {
  success: boolean;
  message?: string;
  sent?: number;
  failed?: number;
  targets?: number;
  platforms?: Array<{ id: number; platform: string | null }>;
}

export const fetchPushAudienceStats = async (): Promise<{
  firebase_ready: boolean;
  audiences: AudienceStat[];
}> => {
  const response = await fetch(`${API_URL}/api/push/audience`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to load audience stats');
  }

  return {
    firebase_ready: result.firebase_ready,
    audiences: result.audiences,
  };
};

export const sendPushToRole = async (
  roleId: number,
  title: string,
  body: string
): Promise<PushSendResult> => {
  const response = await fetch(`${API_URL}/api/push/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      role_id: roleId,
      title,
      body,
      data: {
        type: 'admin_broadcast',
        role_id: String(roleId),
      },
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to send notification');
  }
  return result;
};

export const fetchPushStatus = async (): Promise<{
  firebase_admin_ready: boolean;
  hint?: string;
}> => {
  const response = await fetch(`${API_URL}/api/push/status`);
  const result = await response.json();
  if (!result.success) {
    throw new Error('Failed to check push status');
  }
  return {
    firebase_admin_ready: result.firebase_admin_ready,
    hint: result.hint,
  };
};
