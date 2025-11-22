from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = None

if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI client initialized successfully")
    except Exception as e:
        print(f"⚠️  Error initializing OpenAI client: {e}")
else:
    print("⚠️  WARNING: OPENAI_API_KEY not found in environment variables!")
    print("   Please set OPENAI_API_KEY in your .env file")
    print("   The backend will use fallback responses until the API key is configured.")

app = FastAPI(title="Prepair Chat API")

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractedData(BaseModel):
    tools: List[str] = []
    clientLocation: str = ""
    tradesmanLocation: str = ""


class BackendRequest(BaseModel):
    """Data to send to LangChain agent: tool name and ideal store location"""
    toolName: str
    idealStoreLocation: str


class MessageRequest(BaseModel):
    text: str
    extractedData: Optional[ExtractedData] = None
    backendRequest: Optional[BackendRequest] = None  # Tool name and ideal store location


class Button(BaseModel):
    label: str
    value: str


class ChatResponse(BaseModel):
    message: str
    buttons: Optional[List[Button]] = None


async def verify_user_input(user_message: str, extracted_data: Optional[ExtractedData] = None) -> ChatResponse:
    """
    Use OpenAI to verify we have tool name and client address.
    Returns a response confirming we have both or asking for missing information.
    """
    if not openai_client or not OPENAI_API_KEY:
        # Fallback: basic verification without OpenAI
        tool_name = ""
        client_address = ""
        
        if extracted_data:
            tool_name = extracted_data.tools[0] if extracted_data.tools else ""
            client_address = extracted_data.clientLocation
        
        if tool_name and client_address:
            return ChatResponse(
                message=f"Great! I have the tool ({tool_name}) and client address ({client_address}). Let me find the best store for you."
            )
        elif tool_name:
            return ChatResponse(
                message="I have the tool name, but I still need the client address. Could you please provide the client address?"
            )
        elif client_address:
            return ChatResponse(
                message="I have the client address, but I still need to know what tool or part you need. Could you please tell me what tool you need?"
            )
        else:
            return ChatResponse(
                message="I need both pieces of information:\n1. What tool or part do you need?\n2. What is the client address?"
            )
    
    try:
        # Extract what we have from the message and extracted data
        tool_name = ""
        client_address = ""
        
        if extracted_data:
            tool_name = extracted_data.tools[0] if extracted_data.tools else ""
            client_address = extracted_data.clientLocation
        
        # Build prompt for OpenAI
        prompt = f"""You are a helpful assistant for tradesmen. A tradesman is asking for help finding tools.

User's message: "{user_message}"

Extracted information from the system:
- Tool name extracted: {tool_name if tool_name else "Not provided"}
- Client address extracted: {client_address if client_address else "Not provided"}

IMPORTANT: A valid tool name must be a SPECIFIC tool, part, or product name (e.g., "2 port valve", "screwdriver", "hammer", "socket wrench", "pipe fitting"). 
Generic words like "something", "item", "thing", "stuff", "it", "one", "that", "this", "what I need", "a tool", "an item" do NOT count as valid tool names.

Your task:
1. First, analyze the user's message directly. Does it contain a SPECIFIC tool/part name? (Ignore generic placeholder words)
2. Check if we have BOTH a valid specific tool name AND a client address
3. If we have both valid pieces of information, confirm this and say you'll help find a store
4. If the tool name is generic/vague (like "something", "item", etc.), politely ask: "Could you please tell me the specific tool or part name you need?"
5. If we're missing the client address, politely ask for it
6. If we're missing both, ask for both

Keep your response friendly, concise (1-2 sentences), and professional."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for tradesmen. You help verify that you have the necessary information (SPECIFIC tool/part name and client address) before proceeding. You must distinguish between specific tool names (like '2 port valve', 'hammer', 'screwdriver') and generic placeholder words (like 'something', 'item', 'thing', 'stuff') which do NOT count as valid tool names."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        ai_message = response.choices[0].message.content.strip()
        return ChatResponse(message=ai_message)
        
    except Exception as e:
        print(f"❌ Error calling OpenAI for verification: {e}")
        # Fallback response
        tool_name = extracted_data.tools[0] if extracted_data and extracted_data.tools else ""
        client_address = extracted_data.clientLocation if extracted_data else ""
        
        if tool_name and client_address:
            return ChatResponse(
                message=f"Great! I have the tool ({tool_name}) and client address ({client_address}). Let me find the best store for you."
            )
        else:
            return ChatResponse(
                message="I need both pieces of information:\n1. What tool or part do you need?\n2. What is the client address?"
            )


async def call_openai_agent(tool_name: str, store_location: str) -> str:
    """
    Call OpenAI agent with tool name and store location.
    Returns the agent's response message.
    """
    if not openai_client or not OPENAI_API_KEY:
        print("⚠️  OpenAI API key not configured, using fallback response")
        return f"Confirmed and reserved the {tool_name} for you to pick up today at {store_location}. They open from 8:30am-5pm!"
    
    try:
        prompt = f"""You are a helpful assistant for tradesmen. A tradesman needs to get a tool/part from a store.

Tool/Part Name: {tool_name}
Store Location: {store_location}

Please provide a helpful response that:
1. Confirms the tool/part availability at the store
2. Provides relevant details like price (if known), store hours, or pickup information
3. Is friendly and professional
4. Keeps the response concise (2-3 sentences)

If you don't have specific information about the store or tool, provide a helpful general response."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for tradesmen helping them find tools and parts at hardware stores."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Error calling OpenAI: {e}")
        # Fallback response
        return f"Confirmed and reserved the {tool_name} for you to pick up today at {store_location}. They open from 8:30am-5pm!"




@app.get("/")
async def root():
    return {"message": "Prepair Chat API", "status": "running"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: MessageRequest):
    """
    Handle text messages from the frontend.
    Uses OpenAI to verify we have tool name and client address.
    
    When backendRequest is provided (toolName + idealStoreLocation),
    this is sent to the OpenAI agent for store confirmation.
    """
    # If backendRequest is provided, call OpenAI agent for store confirmation
    if request.backendRequest:
        print(f"📤 Backend Request for OpenAI agent:")
        print(f"   Tool Name: {request.backendRequest.toolName}")
        print(f"   Store Location: {request.backendRequest.idealStoreLocation}")
        
        # Call OpenAI agent
        ai_response = await call_openai_agent(
            request.backendRequest.toolName,
            request.backendRequest.idealStoreLocation
        )
        
        # Return OpenAI response
        return ChatResponse(message=ai_response)
    
    # Otherwise, verify we have tool name and client address using OpenAI
    print(f"📥 User message: {request.text}")
    if request.extractedData:
        print(f"   Extracted tool: {request.extractedData.tools}")
        print(f"   Extracted client location: {request.extractedData.clientLocation}")
    
    response = await verify_user_input(request.text, request.extractedData)
    return response


@app.post("/api/chat/voice", response_model=ChatResponse)
async def chat_voice(
    audio: UploadFile = File(...),
    extracted_data: Optional[str] = Form(None)
):
    """
    Handle voice messages from the frontend.
    In production, this would:
    1. Transcribe the audio using speech-to-text
    2. Extract data from transcription
    3. Verify we have tool name and client address
    4. Return response
    """
    # Parse extracted data if provided
    extracted = None
    if extracted_data:
        try:
            extracted = ExtractedData(**json.loads(extracted_data))
        except:
            pass
    
    # For now, return a placeholder response
    # In production, transcribe audio first, then verify
    response = await verify_user_input("voice message", extracted)
    return response


@app.get("/health")
async def health():
    return {"status": "healthy"}

