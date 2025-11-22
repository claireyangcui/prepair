import { ExtractedData } from '@/lib/types';

/**
 * Extract structured data from user message
 * Looks for tools, client location, and tradesman location
 */
export function extractData(text: string): ExtractedData {
  const extracted: ExtractedData = {
    tools: [],
    clientLocation: '',
    tradesmanLocation: '',
  };

  // Extract tools - look for patterns like "I need [tool]", "looking for [tool]", product names
  const toolPatterns = [
    /(?:I need|looking for|need|want|require)\s+(?:a|an|the)?\s*([^,\.]+?)(?:,|\.|$)/gi,
    /(\d+\s*(?:port|way)\s*(?:valve|switch|socket|outlet))/gi,
    /([A-Z][a-z]+\s+(?:valve|screwdriver|hammer|wrench|pliers|drill|saw|tool|equipment))/gi,
  ];

  const foundTools = new Set<string>();
  toolPatterns.forEach((pattern) => {
    // Use exec in a loop instead of matchAll for ES5 compatibility
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const tool = match[1]?.trim() || match[0]?.trim();
      if (tool && tool.length > 2) {
        foundTools.add(tool.toLowerCase());
      }
      // Prevent infinite loop with global regex
      if (!pattern.global) break;
    }
    // Reset regex lastIndex
    pattern.lastIndex = 0;
  });

  // Also look for common tool/product names
  const commonTools = [
    'valve',
    'screwdriver',
    'hammer',
    'wrench',
    'pliers',
    'drill',
    'saw',
    'socket',
    'outlet',
    'switch',
  ];
  commonTools.forEach((tool) => {
    const regex = new RegExp(`\\b${tool}\\b`, 'gi');
    if (regex.test(text)) {
      foundTools.add(tool);
    }
  });

  extracted.tools = Array.from(foundTools);

  // Extract client location - look for patterns like "heading to [address]", "client at [address]"
  const clientLocationPatterns = [
    /(?:heading to|going to|client at|at client|client location is|destination is)\s+([A-Z0-9][^,\.]+?)(?:,|\.|$)/gi,
    /(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ln|Lane|Blvd|Boulevard|Way|Ct|Court))/gi,
  ];

  for (const pattern of clientLocationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const location = match[0]
        .replace(/^(?:heading to|going to|client at|at client|client location is|destination is)\s+/i, '')
        .replace(/[,\.]$/, '')
        .trim();
      if (location && location.length > 5) {
        extracted.clientLocation = location;
        break;
      }
    }
  }

  // Extract tradesman location - look for patterns like "I'm at [location]", "my location is [location]"
  const tradesmanLocationPatterns = [
    /(?:I'm at|I am at|my location is|currently at|I'm currently at)\s+([A-Z0-9][^,\.]+?)(?:,|\.|$)/gi,
    /(?:at|location)\s+(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ln|Lane|Blvd|Boulevard|Way|Ct|Court))/gi,
  ];

  for (const pattern of tradesmanLocationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const location = match[0]
        .replace(/^(?:I'm at|I am at|my location is|currently at|I'm currently at)\s+/i, '')
        .replace(/^(?:at|location)\s+/i, '')
        .replace(/[,\.]$/, '')
        .trim();
      if (location && location.length > 5) {
        extracted.tradesmanLocation = location;
        break;
      }
    }
  }

  return extracted;
}

