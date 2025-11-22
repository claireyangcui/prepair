from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
import httpx

# Load environment variables from .env file in the backend directory (if it exists)
# Docker Compose passes environment variables directly, so we check those first
env_path = Path(__file__).parent / '.env'
print(f"🔍 Looking for .env file at: {env_path}")
print(f"📁 .env file exists: {env_path.exists()}")

# Try loading from .env file (for local development)
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print("✅ Loaded .env file")

# Initialize OpenAI client - REQUIRED for the application to work
# Check environment variable (from Docker or system) first, then .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = None

print(f"🔑 Checking for OPENAI_API_KEY in environment...")
print(f"   Found: {'Yes' if OPENAI_API_KEY else 'No'}")

if not OPENAI_API_KEY:
    print("❌ ERROR: OPENAI_API_KEY not found in environment variables!")
    print(f"   Please set OPENAI_API_KEY in your .env file at: {env_path}")
    print("   The application requires OpenAI to function.")
    print("   Server will start but API calls will fail until the key is configured.")
else:
    # Show partial API key for debugging (first 7 and last 4 characters)
    masked_key = OPENAI_API_KEY[:7] + "..." + OPENAI_API_KEY[-4:] if len(OPENAI_API_KEY) > 11 else "***"
    print(f"🔑 Found API key: {masked_key}")
    
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI client initialized successfully")
        print(f"🤖 Using model: gpt-4o-mini")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize OpenAI client: {e}")
        import traceback
        traceback.print_exc()
        print("   Server will start but API calls will fail until the issue is resolved.")

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
    sessionId: Optional[str] = None  # Session ID for conversation state


class Button(BaseModel):
    label: str
    value: str


class StoreInfo(BaseModel):
    name: str
    address: str
    openingTime: str
    price: str
    googleMapsUrl: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    buttons: Optional[List[Button]] = None
    storeInfo: Optional[StoreInfo] = None


# Conversation state management (in-memory, will be replaced with proper state management)
# In production, this would be stored in a database or session
conversation_states: Dict[str, Dict] = {}
conversation_history: Dict[str, List[Dict[str, str]]] = {}


async def verify_user_input(user_message: str, extracted_data: Optional[ExtractedData] = None, session_id: str = "default") -> ChatResponse:
    """
    Use OpenAI to respond naturally to user input and extract tool name and client address.
    Returns a conversational response while tracking the key information.
    """
    # Initialize session state and history if needed
    if session_id not in conversation_states:
        conversation_states[session_id] = {"tool_name": "", "client_address": ""}
    if session_id not in conversation_history:
        conversation_history[session_id] = []
    
    state = conversation_states[session_id]
    history = conversation_history[session_id]
    
    # Add current user message to history FIRST (before any state updates)
    history.append({"role": "user", "content": user_message})
    
    # Don't trust extracted_data blindly - we'll let OpenAI analyze the actual conversation
    # Only use extracted_data as a hint for what MIGHT be in the message, but don't update state yet
    
    # OpenAI client must be initialized - this should never happen if setup is correct
    if not openai_client:
        error_msg = "OpenAI client is not initialized. Please check your OPENAI_API_KEY environment variable and restart the server."
        print(f"❌ {error_msg}")
        print(f"   Current OPENAI_API_KEY value: {'Set' if OPENAI_API_KEY else 'Not set'}")
        return ChatResponse(message=error_msg)
    
    try:
        # First, extract information from the ACTUAL conversation using OpenAI
        # This ensures we only trust what's actually in the conversation, not extracted_data
        extraction_prompt = f"""Analyze this conversation and extract ONLY what is explicitly mentioned:

1. Tool/Part Name: A SPECIFIC tool, part, or product name (e.g., "2 port valve", "screwdriver", "hammer")
   - Generic words like "something", "item", "thing", "stuff", "it", "one", "that", "this", "what I need", "a tool", "an item" do NOT count
   - Only extract if a SPECIFIC tool name is mentioned
2. Client Address: A specific address (e.g., "34 Marsh Wall St")
   - Only extract if an actual address is mentioned

Conversation so far:
{chr(10).join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history])}

Respond ONLY in this exact format (one line each):
TOOL: [specific tool name if found, otherwise leave empty]
ADDRESS: [address if found, otherwise leave empty]"""

        # Extract information from conversation
        extracted_tool = ""
        extracted_address = ""
        
        try:
            extraction_response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a data extraction assistant. Extract ONLY what is explicitly mentioned in the conversation. Be strict - if information is not clearly stated, leave it empty."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0.1,  # Low temperature for accurate extraction
                max_tokens=100
            )
            
            extraction_text = extraction_response.choices[0].message.content.strip()
            print(f"🔍 Extraction result: {extraction_text}")
            
            # Parse extraction results - only update state if we find something valid
            lines = extraction_text.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('TOOL:'):
                    extracted_tool = line.replace('TOOL:', '').strip()
                    # Only update if we found a valid, specific tool name
                    if extracted_tool and extracted_tool.lower() not in ["not found", "none", "", "n/a"]:
                        # Additional check: make sure it's not a generic word
                        generic_words = ["something", "item", "thing", "stuff", "it", "one", "that", "this", "what i need", "a tool", "an item", "tool"]
                        if extracted_tool.lower() not in generic_words:
                            state["tool_name"] = extracted_tool
                            print(f"✅ Extracted tool: {extracted_tool}")
                        else:
                            print(f"⚠️  Ignored generic tool name: {extracted_tool}")
                elif line.startswith('ADDRESS:'):
                    extracted_address = line.replace('ADDRESS:', '').strip()
                    # Only update if we found a valid address
                    if extracted_address and extracted_address.lower() not in ["not found", "none", "", "n/a"]:
                        # Additional check: make sure it looks like an address (has numbers or street indicators)
                        if any(char.isdigit() for char in extracted_address) or any(word in extracted_address.lower() for word in ["st", "street", "rd", "road", "ave", "avenue", "dr", "drive", "ln", "lane"]):
                            state["client_address"] = extracted_address
                            print(f"✅ Extracted address: {extracted_address}")
                        else:
                            print(f"⚠️  Ignored invalid address format: {extracted_address}")
            
            # Log current state for debugging
            print(f"📊 Current state - Tool: '{state.get('tool_name', '')}', Address: '{state.get('client_address', '')}'")
        except Exception as e:
            print(f"⚠️  Warning: Could not extract info from conversation: {e}")
            import traceback
            traceback.print_exc()
        
        # Check if we have both tool name and client address
        # If yes, automatically find a store and show confirmation dialog
        if state.get("tool_name") and state.get("client_address"):
            # We have both pieces of information - automatically find a store
            print(f"✅ Have both tool and address - finding store automatically")
            print(f"   Tool: {state.get('tool_name')}")
            print(f"   Address: {state.get('client_address')}")
            
            # Use client address as the preferred store location
            try:
                store_response = await call_openai_agent(
                    state.get("tool_name"),
                    state.get("client_address")
                )
                # Store the store info in conversation state for later use
                if store_response.storeInfo:
                    state["last_store_info"] = {
                        "name": store_response.storeInfo.name,
                        "address": store_response.storeInfo.address,
                        "openingTime": store_response.storeInfo.openingTime,
                        "price": store_response.storeInfo.price,
                        "googleMapsUrl": store_response.storeInfo.googleMapsUrl
                    }
                return store_response
            except Exception as e:
                print(f"❌ Error finding store: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to regular response
        
        # Let OpenAI respond naturally based on the conversation
        system_message = """You are a helpful assistant for tradesmen. Your job is to help them find tools and parts they need.

You need to collect two pieces of information:
1. Tool/Part Name: A SPECIFIC tool, part, or product name (e.g., "2 port valve", "screwdriver", "hammer")
2. Client Address: The address where the client is located (e.g., "34 Marsh Wall St")

Once you have both pieces of information, the system will automatically find a nearby store for them. You don't need to ask for confirmation to search - just acknowledge that you have the information.

Respond naturally and conversationally to the user's message. Be helpful, friendly, and professional. 
Only respond based on what is ACTUALLY in the conversation - don't make assumptions or use information that wasn't provided.

If the user says "no" to a store option, acknowledge it and the system will find another option."""

        # Build messages for OpenAI with conversation history
        messages = [{"role": "system", "content": system_message}]
        
        # Add conversation history (last 10 messages for context)
        for msg in history[-10:]:
            messages.append(msg)
        
        # Call OpenAI with the conversation - higher temperature for more natural, varied responses
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.8,
            max_tokens=300
        )
        
        ai_message = response.choices[0].message.content.strip()
        print(f"💬 OpenAI response: {ai_message}")
        
        # Add AI response to history
        history.append({"role": "assistant", "content": ai_message})
        
        return ChatResponse(message=ai_message)
        
    except Exception as e:
        print(f"❌ Error calling OpenAI: {e}")
        import traceback
        traceback.print_exc()
        
        # Return error message instead of hardcoded fallback
        return ChatResponse(
            message="I'm sorry, I encountered an error processing your message. Please try again."
        )


async def find_alternative_store(tool_name: str, store_location: str, previous_store_name: str = "") -> ChatResponse:
    """
    Find an alternative store option (different from the previous one).
    Returns a ChatResponse with store information, message, and buttons.
    """
    if not openai_client:
        raise Exception("OpenAI client is not initialized. Please check your .env file and restart the server.")
    
    try:
        # Let OpenAI generate a response with store details for a DIFFERENT store
        avoid_store_note = f"\n\nIMPORTANT: Do NOT suggest '{previous_store_name}' as it was already declined. Find a DIFFERENT store." if previous_store_name else ""
        
        prompt = f"""A tradesman needs to get a tool/part from a store, but they declined the previous option.

Tool/Part Name: {tool_name}
Preferred Store Location: {store_location}
Previous Store (to avoid): {previous_store_name if previous_store_name else "None"}
{avoid_store_note}

Find a DIFFERENT nearby store option. Generate realistic information including:
1. Store name (e.g., "AB Hardware", "XY Hardware", "Home Depot", "B&Q", "Wickes", "Screwfix") - MUST be different from the previous store
2. Store address (a realistic address in the area, include street number, street name, and city/postcode)
3. Opening hours (e.g., "8:30am-5pm", "9am-6pm", "7am-8pm", "Monday-Friday 8am-6pm")
4. Price for the item (e.g., "$12", "$25.99", "£15", "€20") - can be different from previous option

You MUST respond with ONLY valid JSON in this exact format:
{{
  "message": "A friendly message confirming the item is available at this alternative store. Mention the store name, confirm availability, state the price, and mention opening hours. Example: 'No problem! I found another option - the {tool_name} at XY Hardware for $15. They're open from 9am-6pm today.'",
  "storeName": "Store Name Here (MUST be different from previous)",
  "storeAddress": "123 Street Name, City, Postcode",
  "openingTime": "8:30am-5pm",
  "price": "$12"
}}

Important: Respond with ONLY the JSON object, no additional text, no markdown formatting, no code blocks."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for tradesmen. You help find tools and parts at hardware stores. Always respond with valid JSON in the exact format requested. When finding alternatives, always suggest a DIFFERENT store."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,  # Higher temperature for more variation
            max_tokens=300,
            response_format={"type": "json_object"}
        )
        
        import json
        ai_response = json.loads(response.choices[0].message.content.strip())
        
        # Extract store information
        store_name = ai_response.get("storeName", store_location)
        store_address = ai_response.get("storeAddress", "")
        opening_time = ai_response.get("openingTime", "9am-5pm")
        price = ai_response.get("price", "N/A")
        
        # Format message as confirmation dialog
        if store_address:
            message = f"I found {price} {tool_name} at {store_name} on {store_address}, do we want to get this?"
        else:
            message = f"I found {price} {tool_name} at {store_name}, do we want to get this?"
        
        # Generate Google Maps URL
        google_maps_url = f"https://www.google.com/maps/search/?api=1&query={store_address.replace(' ', '+')}" if store_address else None
        
        # Create store info
        store_info = StoreInfo(
            name=store_name,
            address=store_address,
            openingTime=opening_time,
            price=price,
            googleMapsUrl=google_maps_url
        )
        
        # Create buttons for Yes/No confirmation
        buttons = [
            Button(label="Yes", value="yes_confirm"),
            Button(label="No", value="no_confirm")
        ]
        
        return ChatResponse(
            message=message,
            buttons=buttons,
            storeInfo=store_info
        )
    except Exception as e:
        print(f"❌ Error finding alternative store: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to find alternative store: {e}")


def extract_postcode(location: str) -> str:
    """
    Extract UK postcode from location string.
    UK postcodes are typically in formats like:
    - SW1A 1AA (outward code + inward code)
    - E14 9AB
    - M1 1AA
    - EC1A 1BB
    """
    import re
    # UK postcode pattern: 1-2 letters, 1-2 digits, optional space, 1 digit, 2 letters
    # Examples: SW1A 1AA, E14 9AB, M1 1AA, EC1A 1BB
    postcode_pattern = r'\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b'
    match = re.search(postcode_pattern, location.upper())
    if match:
        return match.group(1).strip()
    return location  # Return original location if no postcode found


async def call_procure_part_api(part_to_acquire: str, location: str) -> Dict:
    """
    Call the procurePart API to get store information.
    
    Args:
        part_to_acquire: A description of the part including part number if possible
        location: The location (address or postcode) where the part would be needed
    
    Returns:
        The API response as a dictionary.
    """
    api_url = "https://myimaginaryhost.com/api/procurePart"
    
    # Extract postcode from location
    location_postcode = extract_postcode(location)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "part_to_acquire": part_to_acquire,
                "location_postcode": location_postcode
            }
            
            print(f"📤 Calling procurePart API:")
            print(f"   URL: {api_url}")
            print(f"   Part to acquire: {part_to_acquire}")
            print(f"   Location (original): {location}")
            print(f"   Location postcode: {location_postcode}")
            print(f"   Payload: {payload}")
            
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            print(f"✅ procurePart API response: {result}")
            return result
            
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP error calling procurePart API: {e.response.status_code} - {e.response.text}")
        raise Exception(f"API returned error: {e.response.status_code}")
    except httpx.RequestError as e:
        print(f"❌ Request error calling procurePart API: {e}")
        raise Exception(f"Failed to connect to API: {e}")
    except Exception as e:
        print(f"❌ Unexpected error calling procurePart API: {e}")
        import traceback
        traceback.print_exc()
        raise


async def call_openai_agent(tool_name: str, store_location: str) -> ChatResponse:
    """
    Call the procurePart API with tool name and store location.
    Returns a ChatResponse with store information, message, and buttons.
    """
    try:
        # Call the real API instead of generating mock data
        api_response = await call_procure_part_api(tool_name, store_location)
        
        # Extract store information from API response
        # Adjust these field names based on the actual API response structure
        store_name = api_response.get("storeName") or api_response.get("store_name") or api_response.get("name") or store_location
        store_address = api_response.get("storeAddress") or api_response.get("store_address") or api_response.get("address") or ""
        opening_time = api_response.get("openingTime") or api_response.get("opening_time") or api_response.get("hours") or "9am-5pm"
        price = api_response.get("price") or api_response.get("cost") or "N/A"
        
        # Format message as confirmation dialog
        if store_address:
            message = f"I found {price} {tool_name} at {store_name} on {store_address}, do we want to get this?"
        else:
            message = f"I found {price} {tool_name} at {store_name}, do we want to get this?"
        
        # Generate Google Maps URL
        google_maps_url = f"https://www.google.com/maps/search/?api=1&query={store_address.replace(' ', '+')}" if store_address else None
        
        # Create store info
        store_info = StoreInfo(
            name=store_name,
            address=store_address,
            openingTime=opening_time,
            price=price,
            googleMapsUrl=google_maps_url
        )
        
        # Create buttons for Yes/No confirmation
        buttons = [
            Button(label="Yes", value="yes_confirm"),
            Button(label="No", value="no_confirm")
        ]
        
        return ChatResponse(
            message=message,
            buttons=buttons,
            storeInfo=store_info
        )
    except Exception as e:
        print(f"❌ Error calling procurePart API: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to get store information: {e}")




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
        
        try:
            # Call OpenAI agent - returns ChatResponse with store info and buttons
            response = await call_openai_agent(
                request.backendRequest.toolName,
                request.backendRequest.idealStoreLocation
            )
            
            # Log store info for debugging
            if response.storeInfo:
                print(f"🏪 Store Info:")
                print(f"   Name: {response.storeInfo.name}")
                print(f"   Address: {response.storeInfo.address}")
                print(f"   Opening Time: {response.storeInfo.openingTime}")
                print(f"   Price: {response.storeInfo.price}")
                if response.storeInfo.googleMapsUrl:
                    print(f"   Google Maps: {response.storeInfo.googleMapsUrl}")
            
            # Return OpenAI response with store info and buttons
            return response
        except Exception as e:
            print(f"❌ Error calling OpenAI agent: {e}")
            import traceback
            traceback.print_exc()
            return ChatResponse(
                message="I'm sorry, I encountered an error processing your request. Please try again."
            )
    
    # Otherwise, verify we have tool name and client address using OpenAI
    # Use provided session ID or generate a new one
    session_id = request.sessionId or f"session_{hash(request.text)}_{len(conversation_states)}"
    
    print(f"📥 User message: {request.text}")
    print(f"   Session ID: {session_id}")
    if request.extractedData:
        print(f"   Extracted tool: {request.extractedData.tools}")
        print(f"   Extracted client location: {request.extractedData.clientLocation}")
    
    # Check current state
    if session_id in conversation_states:
        state = conversation_states[session_id]
        print(f"   Current stored state - Tool: {state.get('tool_name', '')}, Address: {state.get('client_address', '')}")
    
    # Handle "yes_confirm" - user confirmed they want this store option
    text_lower = request.text.lower()
    if text_lower == "yes_confirm":
        # User confirmed - call procurePart API to kick off backend process
        if session_id in conversation_states:
            state = conversation_states[session_id]
            tool_name = state.get("tool_name", "")
            client_address = state.get("client_address", "")
            last_store_info = state.get("last_store_info", {})
            
            if tool_name and last_store_info:
                # Call procurePart API to kick off the backend process
                try:
                    price = last_store_info.get("price", "")
                    opening_time = last_store_info.get("openingTime", "")
                    store_name = last_store_info.get("name", "")
                    store_address = last_store_info.get("address", "")
                    google_maps_url = last_store_info.get("googleMapsUrl")
                    
                    # Call procurePart API with all the information
                    api_response = await call_procure_part_api(tool_name, client_address)
                    
                    print(f"✅ procurePart API called successfully for confirmation")
                    print(f"   Response: {api_response}")
                    
                    # Generate reservation confirmation message with store details
                    confirmation_message = f"It's been reserved for you! The {price} {tool_name} is ready for pickup at {store_name}. They're open from {opening_time}. Use the link below to navigate to {store_address}."
                    
                    # Create store info for the confirmation message (so user can click Google Maps link)
                    store_info = StoreInfo(
                        name=store_name,
                        address=store_address,
                        openingTime=opening_time,
                        price=price,
                        googleMapsUrl=google_maps_url
                    )
                    
                    return ChatResponse(
                        message=confirmation_message,
                        storeInfo=store_info
                    )
                except Exception as e:
                    print(f"❌ Error calling procurePart API for confirmation: {e}")
                    import traceback
                    traceback.print_exc()
                    # Still return a confirmation message even if API call fails
                    price = last_store_info.get("price", "")
                    opening_time = last_store_info.get("openingTime", "")
                    store_name = last_store_info.get("name", "")
                    store_address = last_store_info.get("address", "")
                    google_maps_url = last_store_info.get("googleMapsUrl")
                    
                    confirmation_message = f"It's been reserved for you! The {price} {tool_name} is ready for pickup at {store_name}. They're open from {opening_time}. Use the link below to navigate to {store_address}."
                    
                    store_info = StoreInfo(
                        name=store_name,
                        address=store_address,
                        openingTime=opening_time,
                        price=price,
                        googleMapsUrl=google_maps_url
                    )
                    
                    return ChatResponse(
                        message=confirmation_message,
                        storeInfo=store_info
                    )
            elif tool_name:
                # Fallback if store info not available - still try to call API
                try:
                    await call_procure_part_api(tool_name, client_address or "")
                    print(f"✅ procurePart API called successfully (fallback)")
                except Exception as e:
                    print(f"⚠️  Warning: Could not call procurePart API: {e}")
                
                confirmation_message = f"Confirmed and reserved the {tool_name} for you to pick up today! Find it on Google Maps"
                return ChatResponse(message=confirmation_message)
    
    # Handle "no_confirm" - user doesn't want this store, find another one
    if text_lower == "no_confirm":
        # User declined - find another store option
        if session_id in conversation_states:
            state = conversation_states[session_id]
            if state.get("tool_name") and state.get("client_address"):
                # Track previous store to avoid suggesting the same one
                previous_store = state.get("last_store_info", {}).get("name", "")
                
                # Find another store option (different from the previous one)
                try:
                    store_response = await find_alternative_store(
                        state.get("tool_name"),
                        state.get("client_address"),
                        previous_store
                    )
                    # Update state with new store info
                    if store_response.storeInfo:
                        state["last_store_info"] = {
                            "name": store_response.storeInfo.name,
                            "address": store_response.storeInfo.address,
                            "openingTime": store_response.storeInfo.openingTime,
                            "price": store_response.storeInfo.price,
                            "googleMapsUrl": store_response.storeInfo.googleMapsUrl
                        }
                    return store_response
                except Exception as e:
                    print(f"❌ Error finding alternative store: {e}")
                    # Fall through to regular response
    
    # Check if user gave negative feedback about the current store option
    # (e.g., "no", "don't want", "too expensive", "too far", "find another", etc.)
    if session_id in conversation_states:
        state = conversation_states[session_id]
        last_store_info = state.get("last_store_info", {})
        
        # If we have a store option shown and user gives feedback
        if last_store_info and state.get("tool_name") and state.get("client_address"):
            # Check if the message contains negative feedback
            negative_keywords = ["no", "don't", "dont", "not", "too expensive", "too far", "find another", 
                                "different", "other", "else", "instead", "rather", "prefer", "cheaper", 
                                "closer", "better", "another option"]
            
            text_lower = request.text.lower()
            is_negative_feedback = any(keyword in text_lower for keyword in negative_keywords)
            
            # Also check if it's not "yes" or positive confirmation
            is_not_positive = "yes" not in text_lower and "confirm" not in text_lower and "ok" not in text_lower
            
            if is_negative_feedback and is_not_positive:
                # User gave negative feedback - find alternative store
                print(f"🔄 User gave negative feedback, finding alternative store...")
                previous_store = last_store_info.get("name", "")
                try:
                    store_response = await find_alternative_store(
                        state.get("tool_name"),
                        state.get("client_address"),
                        previous_store
                    )
                    # Update state with new store info
                    if store_response.storeInfo:
                        state["last_store_info"] = {
                            "name": store_response.storeInfo.name,
                            "address": store_response.storeInfo.address,
                            "openingTime": store_response.storeInfo.openingTime,
                            "price": store_response.storeInfo.price,
                            "googleMapsUrl": store_response.storeInfo.googleMapsUrl
                        }
                    return store_response
                except Exception as e:
                    print(f"❌ Error finding alternative store: {e}")
                    # Fall through to regular response
    
    response = await verify_user_input(request.text, request.extractedData, session_id)
    return response


@app.post("/api/chat/voice", response_model=ChatResponse)
async def chat_voice(
    audio: UploadFile = File(...),
    extracted_data: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None)
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
    
    # Use provided session ID or generate a new one
    session = session_id or f"session_voice_{hash(str(audio.filename))}_{len(conversation_states)}"
    
    # For now, return a placeholder response
    # In production, transcribe audio first, then verify
    response = await verify_user_input("voice message", extracted, session)
    return response


@app.get("/health")
async def health():
    return {"status": "healthy"}

