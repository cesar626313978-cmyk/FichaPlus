export async function generateSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function formatShortHash(fullHash: string): string {
  if (!fullHash || fullHash.length < 12) return fullHash || 'e3b0c44298fc...';
  return `#${fullHash.substring(0, 6)}...${fullHash.substring(fullHash.length - 4)}`;
}
