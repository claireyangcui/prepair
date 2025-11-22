# Prepair Backend API

FastAPI backend for the Prepair chat interface. Uses OpenAI agent for intelligent responses when tool name and store location are provided.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
Create a `.env` file in the `backend` directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST `/api/chat`
Send a text message and receive a response.

Request body:
```json
{
  "text": "I need a 2 port valve, I'm heading to client at 34 Marsh Wall St",
  "extractedData": {
    "tools": ["2 port valve"],
    "clientLocation": "34 Marsh Wall St",
    "tradesmanLocation": ""
  },
  "backendRequest": {
    "toolName": "2 port valve",
    "idealStoreLocation": "xy hardware"
  }
}
```

**Note**: 
- For regular messages, the backend uses OpenAI to verify we have both the tool name and client address
- The `backendRequest` field is sent when the user confirms a store. This contains:
  - `toolName`: The name of the tool/part needed
  - `idealStoreLocation`: The location/name of the ideal store to get the part

When `backendRequest` is provided, the backend calls the OpenAI agent with this information to generate an intelligent response about tool availability, pricing, store hours, etc.

Example Response (after verification):
```json
{
  "message": "Great! I have the tool (2 port valve) and client address (34 Marsh Wall St). Let me find the best store for you."
}
```

### POST `/api/chat/voice`
Send a voice message (audio file) and receive a response.

Form data:
- `audio`: Audio file (WebM format)
- `extracted_data`: Optional JSON string with extracted data

## OpenAI Integration

The backend uses OpenAI's GPT-4o-mini model for two purposes:

1. **Input Verification**: When a user sends a message, OpenAI verifies that we have:
   - Tool/part name
   - Client address
   
   If either is missing, OpenAI politely asks for the missing information.

2. **Store Confirmation**: When a store is selected, OpenAI generates intelligent responses about:
   - Tool/part availability at the store
   - Relevant details (price, store hours, pickup information)
   - Friendly, professional responses

## Future Integration

This backend is structured to easily integrate with:
- LiveKit + ElevenLabs for voice processing
- Database for conversation state management
- WhatsApp Business API for actual WhatsApp integration
- Enhanced tool/part database for more accurate information

