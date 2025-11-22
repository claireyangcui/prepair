export interface ExtractedData {
  tools: string[];
  clientLocation: string;
  tradesmanLocation: string;
}

// Data to send to backend for processing
export interface BackendRequest {
  toolName: string;
  idealStoreLocation: string;
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
  buttons?: Array<{ label: string; value: string }>;
  storeInfo?: StoreInfo;
}

export interface StoreInfo {
  name: string;
  address: string;
  openingTime: string;
  price: string;
  googleMapsUrl?: string;
}

export interface ChatResponse {
  message: string;
  buttons?: Array<{ label: string; value: string }>;
  storeInfo?: StoreInfo;
}

export interface MessageRequest {
  text: string;
  extractedData?: ExtractedData;
  backendRequest?: BackendRequest; // Tool name and ideal store location
  sessionId?: string; // Session ID for conversation state
}

