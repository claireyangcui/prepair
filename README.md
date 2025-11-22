# prepair
Agentic tool helping tradesmen filling the gap of tools, materials and information for the job

## Overview

A WhatsApp-like web chat interface for tradesmen to request tools and materials. The frontend collects user input (text and voice), extracts structured data (tools list, client location, tradesman location), and communicates with a FastAPI backend that will integrate with a LangChain agent.

## Project Structure

```
prepair/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main chat page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ChatInterface.tsx # Main chat component
│   ├── Message.tsx       # User message component
│   ├── AIMessage.tsx     # AI message with buttons
│   ├── MessageInput.tsx  # Text input component
│   └── VoiceRecorder.tsx # Voice recording component
├── lib/                  # Utilities and types
│   ├── api.ts           # API client for backend
│   └── types.ts         # TypeScript interfaces
├── utils/                # Helper functions
│   └── dataExtractor.ts # Extract tools and locations from text
└── backend/             # FastAPI backend
    ├── main.py          # FastAPI application
    └── requirements.txt  # Python dependencies
```

## Setup

### Quick Start with Docker (Recommended)

1. Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

2. Start both backend and frontend with one command:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

To stop the services:
```bash
docker-compose down
```

### Manual Setup

### Frontend (Next.js)

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend (FastAPI)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the `backend` directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

5. Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Features

- **WhatsApp-like UI**: Clean, familiar chat interface
- **Text Input**: Send text messages with automatic data extraction
- **Voice Input**: Record and send voice messages
- **Data Extraction**: Automatically extracts:
  - Tools list (e.g., "2 port valve")
  - Client location (e.g., "34 Marsh Wall St")
  - Tradesman location
- **Interactive Buttons**: AI responses can include Yes/No buttons
- **OpenAI Integration**: Backend uses OpenAI to verify we have tool name and client address, and generates intelligent responses
- **Information Verification**: OpenAI ensures we have both required pieces of information before proceeding

## Environment Variables

### For Docker Setup

Create a `.env` file in the root directory:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### For Manual Setup

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Create a `.env` file in the `backend` directory:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## OpenAI Integration

The backend uses OpenAI GPT-4o-mini to:

1. **Verify User Input**: When a user sends a message, OpenAI verifies that we have:
   - Tool/part name
   - Client address
   
   If either is missing, OpenAI politely asks for the missing information.

2. **Store Confirmation**: When a store is selected, OpenAI generates intelligent responses about:
   - Tool/part availability
   - Pricing information
   - Store hours
   - Pickup details

## Future Integration

The backend is structured to easily integrate with:
- LiveKit + ElevenLabs for voice processing
- WhatsApp Business API for actual WhatsApp integration
- Database for conversation state management
- Enhanced tool/part database for more accurate information

## Development

- Frontend: React 18, Next.js 14, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.8+
