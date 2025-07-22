/**
 * Shared username generation utility for SMS and Email flows
 * Generates usernames in the format: "logan4", "loganmay0", etc.
 */

export const generateUsername = (name: string): string => {
  // Clean the name: lowercase, remove special chars and extra spaces
  const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const words = cleanName.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return 'user' + Math.floor(Math.random() * 1000);
  }
  
  let baseUsername: string;
  
  if (words.length === 1) {
    // Single word: "Logan" → "logan"
    baseUsername = words[0];
  } else {
    // Multiple words: "Logan May" → "loganmay"
    baseUsername = words.join('');
  }
  
  // Add random number (0-9) to ensure uniqueness
  const randomNum = Math.floor(Math.random() * 10);
  return baseUsername + randomNum;
};

export const validateUsername = (username: string): boolean => {
  // Username validation rules
  const usernameRegex = /^[a-z0-9]{3,20}$/;
  return usernameRegex.test(username);
};

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  // In a real implementation, this would check against your backend
  // For now, return true (assuming available)
  // TODO: Implement actual username availability check
  return true;
};

export const generateUniqueUsername = async (name: string, maxAttempts: number = 10): Promise<string> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const username = generateUsername(name);
    
    if (await isUsernameAvailable(username)) {
      return username;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp if all attempts fail
  const timestamp = Date.now().toString().slice(-4);
  return 'user' + timestamp;
};

export const formatDisplayUsername = (username: string): string => {
  return `@${username}`;
};

// Username generation patterns for testing
export const testUsernameGeneration = () => {
  const testCases = [
    'Logan',
    'Logan May', 
    'John Smith',
    'María García',
    'Jean-Pierre',
    'O\'Connor',
    'Test User 123'
  ];
  
  console.log('Username Generation Test Cases:');
  testCases.forEach(name => {
    const username = generateUsername(name);
    console.log(`"${name}" → "${username}"`);
  });
};