export type VideoProvider = "youtube" | "vimeo";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
  /** URL prête à être posée dans un `iframe`. */
  embedUrl: string;
};

/**
 * `youtube-nocookie` plutôt que `youtube` : le lecteur classique dépose des
 * cookies publicitaires dès l'affichage de la page, ce qui ferait entrer un
 * article de blog dans le champ du bandeau de consentement. Le domaine sans
 * cookie n'en dépose qu'au lancement de la lecture.
 */
const YOUTUBE_EMBED = "https://www.youtube-nocookie.com/embed";
const VIMEO_EMBED = "https://player.vimeo.com/video";

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  /youtu\.be\/([\w-]{11})/i,
  /youtube\.com\/shorts\/([\w-]{11})/i,
  /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i,
];

// Le second groupe est le jeton des vidéos « non répertoriées » : sans lui,
// le lecteur répond « vidéo privée » alors que le lien fonctionne au clic.
const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/i;

/**
 * Extrait le lecteur embarquable d'une URL collée.
 *
 * Renvoie `null` pour tout ce qui n'est pas reconnu, plutôt que de fabriquer
 * une URL au hasard : un `iframe` vers un domaine inattendu dans un article
 * publié est un risque qu'on ne prend pas.
 */
export const parseVideoUrl = (url: string): ParsedVideo | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        provider: "youtube",
        id: match[1],
        embedUrl: `${YOUTUBE_EMBED}/${match[1]}`,
      };
    }
  }

  const vimeo = trimmed.match(VIMEO_PATTERN);
  if (vimeo) {
    const [, id, token] = vimeo;
    return {
      provider: "vimeo",
      id,
      embedUrl: token
        ? `${VIMEO_EMBED}/${id}?h=${token}`
        : `${VIMEO_EMBED}/${id}`,
    };
  }

  return null;
};
