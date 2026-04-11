/**
 * Parses text to find all @username patterns.
 * Usernames can contain letters, numbers, underscores, and hyphens.
 * 
 * @param {string} text - The text to parse for mentions.
 * @returns {string[]} An array of unique usernames found (without the @ symbol).
 */
const parseMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Regex matches @ followed by letters, numbers, underscores, or hyphens
  // Using global flag to find all occurrences
  const mentionRegex = /@([\w-]+)/g;
  const matches = text.matchAll(mentionRegex);
  
  const usernames = new Set();
  for (const match of matches) {
    // match[1] is the first capturing group (the username part)
    usernames.add(match[1]);
  }

  return Array.from(usernames);
};

module.exports = {
  parseMentions,
};
