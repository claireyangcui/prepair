'use client';

import { Message as MessageType } from '@/lib/types';

interface AIMessageProps {
  message: MessageType;
  onButtonClick?: (value: string) => void;
}

export default function AIMessage({ message, onButtonClick }: AIMessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  // Check if message contains a Google Maps link
  const hasMapLink = message.text.toLowerCase().includes('google map');

  const handleMapClick = () => {
    // In a real implementation, this would open Google Maps
    // For now, we'll just log it
    console.log('Opening Google Maps');
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[70%] rounded-lg px-4 py-2 shadow-sm bg-white text-gray-800">
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.text}
        </p>
        {hasMapLink && (
          <button
            onClick={handleMapClick}
            className="mt-2 text-xs text-whatsapp-green hover:underline"
          >
            find it on Google map
          </button>
        )}
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {message.buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick?.(button.value)}
                className="px-4 py-2 bg-whatsapp-green text-white rounded-lg text-sm hover:bg-whatsapp-darkGreen transition-colors"
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-gray-500 mt-1 block text-right">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

