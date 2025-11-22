'use client';

import { Message as MessageType } from '@/lib/types';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={`flex mb-4 ${
        message.type === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
          message.type === 'user'
            ? 'bg-whatsapp-lightGreen text-gray-800'
            : 'bg-white text-gray-800'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <span className="text-xs text-gray-500 mt-1 block text-right">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

