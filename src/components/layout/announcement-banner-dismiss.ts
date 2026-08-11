/** Hash simple (non cryptographique) pour deriver une cle de dismissal stable par message. */
const hashMessage = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

export const dismissKey = (message: string): string =>
  `announcement-banner-dismissed:${hashMessage(message)}`;
