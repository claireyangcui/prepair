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
      className={`flex mb-1 px-2 relative z-10 ${
        message.type === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {message.type !== 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-2 mt-1 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      )}
      <div
        className={`max-w-[65%] rounded-lg px-2 py-1.5 ${
          message.type === 'user'
            ? 'bg-[#DCF8C6] text-black rounded-tr-none'
            : 'bg-white text-black rounded-tl-none shadow-sm'
        }`}
        style={{
          backgroundColor: message.type === 'user' ? 'rgb(220, 248, 198)' : 'rgb(255, 255, 255)',
          opacity: 1,
          zIndex: 10,
        }}
      >
        <p 
          className="text-sm whitespace-pre-wrap break-words leading-relaxed text-black font-normal"
          style={{ color: 'rgb(0, 0, 0)', opacity: 1, fontWeight: 400 }}
        >
          {message.text}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          {message.type === 'user' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#53BDEB]" viewBox="0 0 16 15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

