import { ChatResponse, ExtractedData, BackendRequest } from '@/lib/types';

// Mock conversation state
let mockState: {
  lastTool?: string;
  lastStore?: string;
  waitingForConfirmation?: boolean;
} = {};

/**
 * Mock API service that simulates backend responses
 * Matches the conversation flow from the image
 */
export function mockSendMessage(
  text: string,
  extractedData?: ExtractedData,
  backendRequest?: BackendRequest
): Promise<ChatResponse> {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const textLower = text.toLowerCase().trim();

      // Log backend request if provided (this is what would be sent to the actual backend)
      if (backendRequest) {
        console.log('📤 Mock Backend Request:', {
          toolName: backendRequest.toolName,
          idealStoreLocation: backendRequest.idealStoreLocation,
        });
      }

      // Handle button click responses
      if (textLower === 'yes_xy_hardware' || textLower === 'yes_ab_hardware') {
        mockState.waitingForConfirmation = true;
        resolve({
          message: 'Just a couple of minutes, checking with them',
        });
        return;
      }

      if (textLower === 'no_ab_hardware' || (textLower.includes('no') && textLower.includes('bad reputation'))) {
        mockState.lastStore = 'xy_hardware';
        resolve({
          message: 'how about xy hardware, it\'s also nearby',
          buttons: [
            { label: 'Yes', value: 'yes_xy_hardware' },
            { label: 'No', value: 'no_xy_hardware' },
          ],
        });
        return;
      }

      // If waiting for confirmation, return final message
      if (mockState.waitingForConfirmation) {
        mockState.waitingForConfirmation = false;
        const toolName = mockState.lastTool || (extractedData?.tools?.[0] || '2 port valve');
        mockState.lastTool = toolName;
        resolve({
          message: `Confirmed and reserved the $12 ${toolName} for you to pick up today, they open from 8:30am-5pm! find it on Google map`,
        });
        return;
      }

      // Check if user is asking for tools/help
      if (
        ['need', 'looking for', 'want', 'require', 'heading to'].some(
          (keyword) => textLower.includes(keyword)
        )
      ) {
        // Store tool information
        if (extractedData?.tools && extractedData.tools.length > 0) {
          mockState.lastTool = extractedData.tools[0];
        }

        // First suggestion - AB hardware
        if (!textLower.includes('ab hardware') && !textLower.includes('bad reputation')) {
          mockState.lastStore = 'ab_hardware';
          resolve({
            message:
              'I can see that the closest store that may have this is AB hardware, would you like me to call to confirm',
            buttons: [
              { label: 'Yes', value: 'yes_ab_hardware' },
              { label: 'No', value: 'no_ab_hardware' },
            ],
          });
          return;
        }
      }

      // Default response
      resolve({
        message: 'I understand. How can I help you further?',
      });
    }, 500); // 500ms delay to simulate network
  });
}

export function mockSendVoiceMessage(
  audioBlob: Blob,
  extractedData?: ExtractedData
): Promise<ChatResponse> {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // For voice messages, treat similar to text but with a note
      resolve({
        message:
          'I received your voice message. Could you please type your request? Voice transcription will be available soon.',
      });
    }, 800); // Slightly longer delay for voice
  });
}

