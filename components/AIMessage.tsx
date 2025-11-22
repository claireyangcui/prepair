'use client';

import { Message as MessageType } from '@/lib/types';

interface AIMessageProps {
  message: MessageType;
  onButtonClick?: (value: string) => void;
  disabled?: boolean;
}

export default function AIMessage({ message, onButtonClick, disabled = false }: AIMessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleMapClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Check if this is a confirmation dialog (has storeInfo and buttons)
  const isConfirmationDialog = message.storeInfo && message.buttons && message.buttons.length > 0;

  return (
    <div className="flex justify-start mb-1 px-2 relative z-10">
      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-2 mt-1 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div 
        className={`max-w-[65%] rounded-lg px-3 py-2 bg-white rounded-tl-none shadow-sm ${isConfirmationDialog ? 'border border-gray-300' : ''}`}
        style={{
          backgroundColor: 'rgb(255, 255, 255)',
          opacity: 1,
          zIndex: 10,
        }}
      >
        {isConfirmationDialog ? (
          // Confirmation Dialog Style
          <div className="py-2">
            <p 
              className="text-sm text-center text-black font-medium mb-4 leading-relaxed"
              style={{ color: 'rgb(0, 0, 0)', opacity: 1, fontWeight: 500 }}
            >
              {message.text}
            </p>
            
            {/* Yes/No Buttons Side by Side */}
            {message.buttons && message.buttons.length > 0 && (
              <div className="flex gap-2 justify-center">
                {message.buttons.map((button, index) => (
                  <button
                    key={index}
                    onClick={() => onButtonClick?.(button.value)}
                    disabled={disabled}
                    className="px-6 py-2 border border-gray-400 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Regular Message Style
          <>
            <p 
              className="text-sm whitespace-pre-wrap break-words leading-relaxed text-black font-normal"
              style={{ color: 'rgb(0, 0, 0)', opacity: 1, fontWeight: 400 }}
            >
              {message.text}
            </p>
            
            {/* Store Information Card (for non-confirmation messages) */}
            {message.storeInfo && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{message.storeInfo.name}</h4>
                      {message.storeInfo.address && (
                        <p className="text-xs text-gray-600 mt-0.5">{message.storeInfo.address}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                    {message.storeInfo.openingTime && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{message.storeInfo.openingTime}</span>
                      </div>
                    )}
                    {message.storeInfo.price && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{message.storeInfo.price}</span>
                      </div>
                    )}
                  </div>
                  
                  {message.storeInfo.googleMapsUrl && (
                    <button
                      onClick={() => handleMapClick(message.storeInfo?.googleMapsUrl)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[#008069] hover:text-[#006b57] hover:underline transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Find it on Google Maps</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons (for non-confirmation messages) */}
            {message.buttons && message.buttons.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {message.buttons.map((button, index) => (
                  <button
                    key={index}
                    onClick={() => onButtonClick?.(button.value)}
                    disabled={disabled}
                    className="px-4 py-2 bg-[#008069] text-white rounded-lg text-sm hover:bg-[#006b57] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#008069]"
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

