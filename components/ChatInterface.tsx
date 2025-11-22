'use client';

import { useState, useEffect, useRef } from 'react';
import { Message as MessageType, BackendRequest } from '@/lib/types';
import Message from './Message';
import AIMessage from './AIMessage';
import MessageInput from './MessageInput';
import { sendMessage, sendVoiceMessage } from '@/lib/api';
import { extractData } from '@/utils/dataExtractor';

export default function ChatInterface() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Hi! I\'m here to help you find the tools you need. Could you please tell me:\n1. What tool or part do you need to buy?\n2. What is the client address you are going to?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    // Add user message
    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Extract data
    const extractedData = extractData(text);

    // Update tool name if found
    if (extractedData.tools && extractedData.tools.length > 0) {
      setCurrentToolName(extractedData.tools[0]);
    }

    // Determine if user is confirming a store
    const textLower = text.toLowerCase();
    let backendRequest: BackendRequest | undefined;

    // If user confirms a store (clicks Yes), prepare backend request
    if (textLower.includes('yes_xy_hardware') || textLower.includes('yes_ab_hardware')) {
      const storeName = textLower.includes('xy') ? 'xy hardware' : 'ab hardware';
      setIdealStoreLocation(storeName);
      
      // Get tool name from current state or extracted data
      const toolName = currentToolName || extractedData.tools?.[0] || '';
      
      // Create backend request with tool name and ideal store location
      if (toolName) {
        backendRequest = {
          toolName: toolName,
          idealStoreLocation: storeName,
        };
        console.log('📤 Sending to backend (for LangChain agent):', backendRequest);
      }
    }

    // Show loading state
    setIsLoading(true);

    try {
      // Send to backend
      const response = await sendMessage(text, extractedData, backendRequest);

      // Add AI response
      const aiMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.message,
        timestamp: new Date(),
        buttons: response.buttons,
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
    }
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    // For now, we'll show a placeholder message
    // In production, this would be transcribed by the backend
    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      text: '🎤 Voice message',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    try {
      // Send voice to backend
      const response = await sendVoiceMessage(audioBlob);

      const aiMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: response.message,
        timestamp: new Date(),
        buttons: response.buttons,
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
    }
  };

  const handleButtonClick = async (value: string) => {
    // Send button value as a message
    await handleSendMessage(value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-whatsapp-darkGreen text-white px-4 py-3 shadow-md">
        <h1 className="text-lg font-semibold">Prepair Assistant</h1>
        <p className="text-xs text-gray-200">Online</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.map((message) =>
          message.type === 'user' ? (
            <Message key={message.id} message={message} />
          ) : (
            <AIMessage
              key={message.id}
              message={message}
              onButtonClick={handleButtonClick}
            />
          )
        )}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg px-4 py-2 shadow-sm bg-white text-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
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

