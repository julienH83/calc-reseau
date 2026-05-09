"use client";

/**
 * Insère automatiquement les points entre octets quand l'utilisateur tape.
 * Stratégie : si l'utilisateur saisit 3 chiffres consécutifs sans point ET que c'est ≤ 255,
 * on n'ajoute pas le point automatiquement (il pourrait taper "1923" voulant dire "192.3").
 * À la place, on attend que la saisie soit ambiguë et on insère un point quand :
 *  - le caractère qui suit n'est pas un chiffre/point
 *  - OU on a déjà 3 chiffres dans le segment courant
 *
 * Plus simple et plus prévisible : on ne fait que nettoyer (filtrer les caractères invalides)
 * et insérer un point si l'utilisateur tape 3 chiffres ≥ 26 (ex: "26" → ".26", impossible
 * d'avoir un octet à 3 chiffres > 255 utilement). On part sur une normalisation légère :
 * on autorise uniquement [0-9.] et on collapse les points multiples.
 */
export function sanitizeIPInput(raw: string): string {
  // Garde seulement [0-9.] et évite les points doubles
  return raw
    .replace(/[^0-9.]/g, "")
    .replace(/\.{2,}/g, ".");
}

/**
 * Insère automatiquement un point entre octets quand un chiffre tapé fait dépasser 255
 * dans le segment courant. Ex : "192" + "1" → "192.1", "25" + "6" → "25.6".
 */
export function autoFormatIP(prev: string, next: string): string {
  // Si l'utilisateur a effacé du contenu, on ne touche à rien.
  if (next.length < prev.length) return sanitizeIPInput(next);
  const cleaned = sanitizeIPInput(next);
  const segments = cleaned.split(".");
  if (segments.length > 4) return prev;
  // Si le dernier segment dépasse 255, on coupe avant le dernier chiffre tapé et on insère un point.
  const last = segments[segments.length - 1];
  if (last !== undefined && last.length > 0) {
    const n = Number(last);
    if (last.length > 3 || n > 255) {
      // Trop long ou trop grand → essayer de découper
      if (segments.length < 4 && last.length >= 3) {
        // ex: cleaned = "1923" (4 chars sans point) — split en "192" + "3"
        const head = last.slice(0, 3);
        const tail = last.slice(3);
        const headN = Number(head);
        if (headN <= 255) {
          segments[segments.length - 1] = head;
          segments.push(tail);
          return segments.join(".");
        }
      }
      return prev;
    }
  }
  return cleaned;
}
