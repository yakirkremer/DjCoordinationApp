/** Descriptions for music genres (catalog categories). */
export const GENRE_GUIDE = {
  Israeli: {
    he: {
      title: "ישראלי",
      body: "פופ, מזרחי־פופ ולהיטים ישראליים שמכירים כולם — מהקבלת פנים ועד רחבת הריקודים.",
    },
    en: {
      title: "Israeli",
      body: "Israeli pop and hits everyone knows — from reception to the main dance floor.",
    },
  },
  Loazi: {
    he: {
      title: "לועזי",
      body: "מוזיקה בינלאומית — פופ, רוק ודאנס מערביים שמתאימים לקהל מעורב.",
    },
    en: {
      title: "International",
      body: "International pop, rock, and dance — great for a mixed crowd.",
    },
  },
  Mizrahit: {
    he: {
      title: "מזרחי",
      body: "מזרחית, עברית מזרחית ואנרגיה חמה — לרגעים שבהם הרחבה מתלהטת.",
    },
    en: {
      title: "Mizrahit",
      body: "Mizrahi and Mediterranean vibes — for when the floor heats up.",
    },
  },
  Oldies: {
    he: {
      title: "קלאסיקות",
      body: "שירי עבר, נוסטלגיה ולהיטים נצחיים שעובדים בכל גיל.",
    },
    en: {
      title: "Oldies",
      body: "Classics and nostalgia — timeless hits that work for every age.",
    },
  },
  "Hip Hop": {
    he: {
      title: "היפ הופ",
      body: "היפ־הופ, R&B וטרנים עכשוויים — קצב ברור ואנרגיה עירונית.",
    },
    en: {
      title: "Hip Hop",
      body: "Hip hop, R&B, and modern grooves — urban energy with a clear beat.",
    },
  },
  Regatton: {
    he: {
      title: "רגאטון",
      body: "רגאטון ולטיני — קצב לסיבובים, חורף ורגעי מסיבה.",
    },
    en: {
      title: "Reggaeton",
      body: "Reggaeton and Latin club tracks — perfect for party moments.",
    },
  },
  Trance: {
    he: {
      title: "טראנס",
      body: "טראנס ומלודיות אפליות — בנייה ארוכה ודרופ אווירי.",
    },
    en: {
      title: "Trance",
      body: "Trance and melodic builds — long tension and an airy drop.",
    },
  },
  Techno: {
    he: {
      title: "טכנו",
      body: "טכנו ואלקטרוני מכוני — קו ישיר, פחות ווקאל, יותר דרייב.",
    },
    en: {
      title: "Techno",
      body: "Driving techno and electronic — straight groove, more drive, less vocals.",
    },
  },
  Tomorrowland: {
    he: {
      title: "טומורולנד",
      body: "סגנון פסטיבלים — ביג רום, EDM ורגעי השיא של מסיבות חוץ.",
    },
    en: {
      title: "Tomorrowland",
      body: "Festival-style big room and EDM — peak main-stage energy.",
    },
  },
};

/** Descriptions for version drop types (edit/remix style). */
export const DROP_GUIDE = {
  Dance: {
    he: {
      title: "Dance",
      body: "גרסת רחבה קלאסית — דרופ נקי ונגיש, מתאים לרוב האורחים ולרגעי שיא.",
    },
    en: {
      title: "Dance",
      body: "Classic dance-floor version — a clean, crowd-friendly drop for peak moments.",
    },
  },
  House: {
    he: {
      title: "House",
      body: "האוס ופור על הרצפה — גרוב קבוע, תחושת מועדון, מעולה לריקוד רציף.",
    },
    en: {
      title: "House",
      body: "Four-on-the-floor house groove — steady club feel for continuous dancing.",
    },
  },
  Techno: {
    he: {
      title: "Techno",
      body: "גרסה קשוחה ומכונית יותר — פחות מלודיה, יותר לחץ ואנרגיה.",
    },
    en: {
      title: "Techno",
      body: "Harder, more mechanical version — less melody, more pressure and energy.",
    },
  },
  Trance: {
    he: {
      title: "Trance",
      body: "בנייה ארוכה ושיא רגשי — מתאים למי שאוהב דרופ אפי ומרומם.",
    },
    en: {
      title: "Trance",
      body: "Long build and emotional peak — for guests who love an uplifting drop.",
    },
  },
};

export function getGenreGuide(locale, genreId) {
  const entry = GENRE_GUIDE[genreId];
  if (!entry) {
    return {
      title: genreId,
      body:
        locale === "en"
          ? "Custom genre — tracks in this style appear in the catalog under this folder."
          : "סגנון מותאם — שירים בסגנון זה מופיעים בקטלוג תחת תיקייה זו.",
    };
  }
  return entry[locale] || entry.he || { title: genreId, body: "" };
}

export function getDropGuide(locale, dropId) {
  const entry = DROP_GUIDE[dropId];
  if (!entry) return null;
  return entry[locale] || entry.he || null;
}
