'use client';

import { useState, useEffect, useRef } from 'react';
import { Message as MessageType, BackendRequest } from '@/lib/types';
import Message from './Message';
import AIMessage from './AIMessage';
import MessageInput from './MessageInput';
import { sendMessage, sendVoiceMessage } from '@/lib/api';
import { extractData } from '@/utils/dataExtractor';

export default function ChatInterface() {
  // Generate a unique session ID on mount (each page refresh gets a new session)
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hi! What tool do you need and where are you heading to?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false); // Prevent duplicate sends
  // Track tool name and ideal store location for backend
  const [currentToolName, setCurrentToolName] = useState<string>('');
  const [idealStoreLocation, setIdealStoreLocation] = useState<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // Prevent duplicate sends
    if (isSendingRef.current || isLoading) {
      console.log('⚠️ Message send already in progress, ignoring duplicate call');
      return;
    }

    // Mark as sending
    isSendingRef.current = true;
    setIsLoading(true);

    // Add user message
    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date(),
    };
    
    // Use functional update to get the latest messages state
    let updatedMessages: MessageType[] = [];
    setMessages((prev) => {
      updatedMessages = [...prev, userMessage];
      return updatedMessages;
    });

    // Extract data
    const extractedData = extractData(text);

    // Update tool name if found - prioritize the most specific one (longest/first)
    if (extractedData.tools && extractedData.tools.length > 0) {
      // Sort by length (longest first) to get the most specific tool name
      const sortedTools = [...extractedData.tools].sort((a, b) => b.length - a.length);
      const bestToolName = sortedTools[0];
      setCurrentToolName(bestToolName);
      // Update extractedData to use the best tool name as the first item
      extractedData.tools = [bestToolName, ...sortedTools.slice(1)];
    }

    // Log extracted data for debugging
    console.log('📤 Extracted data being sent to backend:', {
      tools: extractedData.tools,
      clientLocation: extractedData.clientLocation,
      tradesmanLocation: extractedData.tradesmanLocation,
    });

    // Determine if user is confirming a store or plan
    const textLower = text.toLowerCase();
    let backendRequest: BackendRequest | undefined;

    // If user confirms a store (clicks Yes), show "Contacting store..." first, then confirm
    if (textLower.includes('yes_xy_hardware') || textLower.includes('yes_ab_hardware') || textLower === 'yes_confirm') {
      // For yes_confirm, we need to get the store info from the previous message (before the user message we just added)
      const lastMessage = updatedMessages[updatedMessages.length - 2]; // Get the message before the one we just added
      const storeName = textLower.includes('xy') ? 'xy hardware' : 
                       textLower.includes('ab') ? 'ab hardware' :
                       lastMessage?.storeInfo?.name || idealStoreLocation || 'nearby store';
      
      setIdealStoreLocation(storeName);
      
      // Get tool name from current state or extracted data
      const toolName = currentToolName || extractedData.tools?.[0] || '';
      
      // First, show "Contacting store..." message
      const contactingMessage: MessageType = {
        id: (Date.now() + 0.5).toString(),
        type: 'ai',
        text: 'Contacting store...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, contactingMessage]);
      
      // Clear loading state since we're showing a message
      setIsLoading(false);
      
      // Wait 2.5 seconds, then send confirmation request
      setTimeout(async () => {
        if (toolName) {
          // Set loading state while waiting for backend response
          setIsLoading(true);
          
          backendRequest = {
            toolName: toolName,
            idealStoreLocation: storeName,
          };
          console.log('📤 Sending to backend (for store confirmation):', backendRequest);
          
          try {
            const response = await sendMessage('yes_confirm', extractedData, backendRequest, sessionId);
            
            // Add AI response with reservation confirmation and store info
            const aiMessage: MessageType = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              text: response.message,
              timestamp: new Date(),
              storeInfo: response.storeInfo,
            };
            setMessages((prev) => [...prev, aiMessage]);
          } catch (error: any) {
            console.error('Error confirming reservation:', error);
            const errorMessage: MessageType = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              text: error?.message || 'Sorry, I encountered an error confirming your reservation. Please try again.',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          } finally {
            setIsLoading(false);
            isSendingRef.current = false;
          }
        } else {
          // No tool name found, reset sending flag
          isSendingRef.current = false;
        }
      }, 2500); // Wait 2.5 seconds
      
      // Return early - don't send the regular message
      return;
    }
    
    // Handle "no_confirm" - user doesn't want this option
    if (textLower === 'no_confirm') {
      // Just send a message that user declined, OpenAI will handle the response
      // No backendRequest needed, just regular chat
    }

    try {
      // Send to backend with session ID
      const response = await sendMessage(text, extractedData, backendRequest, sessionId);

      // Add AI response with store info if available
      const aiMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.message,
        timestamp: new Date(),
        buttons: response.buttons,
        storeInfo: response.storeInfo,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Add error message with more details
      const errorText = error?.message || 'Sorry, I encountered an error. Please try again.';
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false; // Reset sending flag
    }
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    // Prevent duplicate sends
    if (isSendingRef.current || isLoading) {
      console.log('⚠️ Voice message send already in progress, ignoring duplicate call');
      return;
    }

    // Mark as sending
    isSendingRef.current = true;
    setIsLoading(true);

    // For now, we'll show a placeholder message
    // In production, this would be transcribed by the backend
    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      text: '🎤 Voice message',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Extract data from voice message placeholder (in production, would extract from transcription)
      // For now, send empty extracted data - backend will handle voice transcription
      const extractedData = {
        tools: [],
        clientLocation: '',
        tradesmanLocation: '',
      };
      
      // Send voice to backend with session ID and extracted data
      const response = await sendVoiceMessage(audioBlob, extractedData, sessionId);

      const aiMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.message,
        timestamp: new Date(),
        buttons: response.buttons,
        storeInfo: response.storeInfo,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending voice message:', error);
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: 'Sorry, I encountered an error processing your voice message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false; // Reset sending flag
    }
  };

  const handleButtonClick = async (value: string) => {
    // Prevent duplicate button clicks
    if (isSendingRef.current || isLoading) {
      console.log('⚠️ Button click ignored, message send in progress');
      return;
    }
    // Send button value as a message
    await handleSendMessage(value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-transparent text-[#000000] px-4 py-3 shadow-sm flex items-center gap-3">
        <button className="text-[#000000] hover:bg-black/10 rounded-full p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-medium truncate text-[#000000]">Prepair Assistant</h1>
          <p className="text-xs text-[#000000]/80">Online</p>
        </div>
        <button className="text-[#000000] hover:bg-black/10 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="text-[#000000] hover:bg-black/10 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-2 py-4 relative whatsapp-wallpaper">
        {messages.map((message) =>
          message.type === 'user' ? (
            <Message key={message.id} message={message} />
          ) : (
            <AIMessage
              key={message.id}
              message={message}
              onButtonClick={handleButtonClick}
              disabled={isLoading}
            />
          )
        )}
        {isLoading && (
          <div className="flex justify-start mb-1 px-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-2 mt-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="max-w-[65%] rounded-lg px-2 py-1.5 bg-white text-gray-900 rounded-tl-none shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendVoice={handleSendVoice}
        disabled={isLoading}
      />
    </div>
  );
}

