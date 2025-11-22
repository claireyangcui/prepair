import { ChatResponse, MessageRequest } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function sendMessage(
  text: string,
  extractedData?: any,
  backendRequest?: any,
  sessionId?: string
): Promise<ChatResponse> {
  const payload: MessageRequest = {
    text,
    extractedData,
    backendRequest,
    sessionId,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`Backend error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    // Check if it's a network error (backend not running)
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Cannot connect to backend. Please make sure the backend server is running on port 8000.');
    }
    throw error;
  }
}

export async function sendVoiceMessage(
  audioBlob: Blob,
  extractedData?: any,
  sessionId?: string
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice-message.webm');
  if (extractedData) {
    formData.append('extracted_data', JSON.stringify(extractedData));
  }
  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/voice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`Backend error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    // Check if it's a network error (backend not running)
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Cannot connect to backend. Please make sure the backend server is running on port 8000.');
    }
    throw error;
  }
}

