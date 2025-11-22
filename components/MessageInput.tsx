'use client';

import { useState, KeyboardEvent } from 'react';
import VoiceRecorder from './VoiceRecorder';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSendMessage,
  onSendVoice,
  disabled = false,
}: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#F0F2F5] px-2 py-2 flex items-end gap-1">
      {/* Plus icon for attachments */}
      <button
        className="text-[#54656F] hover:bg-gray-300 rounded-full p-2 transition-colors flex-shrink-0"
        title="Attach"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      {/* Input field */}
      <div className="flex-1 flex items-end bg-white rounded-3xl px-4 py-2 min-h-[42px]">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message"
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500 disabled:opacity-50"
        />
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {text.trim() ? (
          // Send button when text is entered
          <button
            onClick={handleSend}
            disabled={disabled}
            className="text-[#008069] hover:bg-gray-300 rounded-full p-2 transition-colors"
            title="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          // Attachment, camera, and microphone when no text
          <>
            <button
              className="text-[#54656F] hover:bg-gray-300 rounded-full p-2 transition-colors"
              title="Attach file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              className="text-[#54656F] hover:bg-gray-300 rounded-full p-2 transition-colors"
              title="Camera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <VoiceRecorder onRecordingComplete={onSendVoice} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  );
}

