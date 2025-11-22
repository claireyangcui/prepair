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
    <div className="flex items-center gap-2 p-4 bg-gray-50 border-t border-gray-200">
      <VoiceRecorder onRecordingComplete={onSendVoice} disabled={disabled} />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-whatsapp-green focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="p-2 rounded-full bg-whatsapp-green text-white hover:bg-whatsapp-darkGreen disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </div>
  );
}

