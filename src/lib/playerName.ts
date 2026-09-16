/** Players better known by a name other than their surname. */
const KNOWN_NAMES: Record<string, string> = {
  Praggnanandhaa: "Pragg",
  Nepomniachtchi: "Nepo",
  Goryachkina: "Gorya",
  Gukesh: "Gukesh",
  Harikrishna: "Hari",
  Erigaisi: "Arjun",
  Koneru: "Humpy",
  Dronavalli: "Harika",
  Deshmukh: "Divya",
  Agrawal: "Vantika",
  Savitha: "Savitha",
};

export function formatPlayerName(name: string, preferSurname = false): string {
  const cleaned = name.replace(/[,.;]/g, "").trim();
  const parts = cleaned.split(" ").filter((part) => part.length > 0);

  for (const part of parts) {
    if (KNOWN_NAMES[part]) return KNOWN_NAMES[part];
  }

  // Broadcast names come as "Surname, First" — the surname is the on-air name
  const commaIndex = name.indexOf(",");
  if (preferSurname && commaIndex > 0) {
    return name.slice(0, commaIndex).trim().slice(0, 12);
  }

  let shortest = parts[0] || "";
  for (const part of parts) {
    if (part.length >= 3 && part.length < shortest.length) {
      shortest = part;
    }
  }
  if (shortest.length < 3) {
    shortest = parts[0] || "";
  }
  return shortest.slice(0, 10);
}
