/**
 * Source + license for every spot photo in assets/images/spots/.
 * All photos are original photographs of the actual place from Wikimedia Commons.
 * Images were only downscaled / recompressed for the app (no other changes).
 * See PHOTO_CREDITS.md for the human-readable list.
 */

export interface PhotoCredit {
  /** Commons file title, e.g. "File:Kaunas Castle in 2011.JPG". */
  title: string;
  /** Plain-text author name as given on Commons. */
  author: string;
  /** Short license name, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string;
  /** Commons file description page. */
  sourceUrl: string;
  /** True when the image content was altered (crop, edit). Resizing alone is not counted. */
  modified: boolean;
}

export const PHOTO_CREDITS: Record<string, PhotoCredit> = {
  'vln-gediminas-tower': {
    title: "File:Gedimino pilis by Augustas Didzgalvis.jpg",
    author: "BigHead",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gedimino_pilis_by_Augustas_Didzgalvis.jpg',
    modified: false,
  },
  'vln-cathedral-square': {
    title: "File:VilniusCathedral square 2014.jpg",
    author: "Abrget47j",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:VilniusCathedral_square_2014.jpg',
    modified: false,
  },
  'vln-gate-of-dawn': {
    title: "File:Vilnius Dawn Gate closeup.jpg",
    author: "Marcin Białek",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vilnius_Dawn_Gate_closeup.jpg',
    modified: false,
  },
  'vln-university': {
    title: "File:Vilnius Universitetas Innenhof 1.jpg",
    author: "Zairon",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vilnius_Universitetas_Innenhof_1.jpg',
    modified: false,
  },
  'vln-uzupis': {
    title: "File:Uzupio by Augustas Didzgalvis.jpg",
    author: "Augustas Didžgalvis",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Uzupio_by_Augustas_Didzgalvis.jpg',
    modified: false,
  },
  'vln-st-anne-church': {
    title: "File:St. Anne's Church in winter (2015).jpg",
    author: "Pavel Pavel",
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:St._Anne%27s_Church_in_winter_(2015).jpg',
    modified: false,
  },
  'vln-three-crosses': {
    title: "File:Three Crosses monument, Vilnius 20180810-1.jpg",
    author: "Suicasmo",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Three_Crosses_monument,_Vilnius_20180810-1.jpg',
    modified: false,
  },
  'vln-grand-dukes-palace': {
    title: "File:Valdovu by Augustas Didzgalvis.jpg",
    author: "Augustas Didžgalvis",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Valdovu_by_Augustas_Didzgalvis.jpg',
    modified: false,
  },
  'vln-peter-paul-church': {
    title: "File:Vilnius Sts Peter et Paul Church 01.jpg",
    author: "Scotch Mist",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vilnius_Sts_Peter_et_Paul_Church_01.jpg',
    modified: false,
  },
  'vln-bastion': {
    title: "File:Vilnius Sienos Basteja 04.jpg",
    author: "Zairon",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vilnius_Sienos_Basteja_04.jpg',
    modified: false,
  },
  'vln-bernardine-garden': {
    title: "File:Bernardinai garden.jpg",
    author: "Pofka",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bernardinai_garden.jpg',
    modified: false,
  },
  'kns-kaunas-castle': {
    title: "File:Kaunas Castle in 2011.JPG",
    author: "Pudelek (Marcin Szala)",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kaunas_Castle_in_2011.JPG',
    modified: false,
  },
  'kns-pazaislis-monastery': {
    title: "File:Pazaislis by Augustas Didzgalvis.jpg",
    author: "Augustas Didžgalvis",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pazaislis_by_Augustas_Didzgalvis.jpg',
    modified: false,
  },
  'kns-town-hall': {
    title: "File:Town hall in Kaunas 01.JPG",
    author: "Хомелка",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Town_hall_in_Kaunas_01.JPG',
    modified: false,
  },
  'kns-aleksotas-funicular': {
    title: "File:Aleksoto funikulierius - panoramio.jpg",
    author: "Aidas U.",
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aleksoto_funikulierius_-_panoramio.jpg',
    modified: false,
  },
  'kns-ninth-fort': {
    title: "File:Kaunas KZ IX. Fort Memorial 01.JPG",
    author: "Zairon",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kaunas_KZ_IX._Fort_Memorial_01.JPG',
    modified: false,
  },
  'plg-sea-pier': {
    title: "File:Palanga Pier Sunset.jpg",
    author: "Michael Kuhn",
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Palanga_Pier_Sunset.jpg',
    modified: false,
  },
  'plg-amber-museum': {
    title: "File:Tiškevičiai Palace at dusk, Palanga, Lithuania - Diliff.jpg",
    author: "Diliff",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ti%C5%A1kevi%C4%8Diai_Palace_at_dusk,_Palanga,_Lithuania_-_Diliff.jpg',
    modified: false,
  },
  'plg-birute-hill': {
    title: "File:Palanga Gora Biruty 2.jpg",
    author: "Andrzej Otrębski",
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Palanga_Gora_Biruty_2.jpg',
    modified: false,
  },
  'trk-island-castle': {
    title: "File:Trakai Island Castle, Lithuania - Diliff.jpg",
    author: "Diliff",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Trakai_Island_Castle,_Lithuania_-_Diliff.jpg',
    modified: false,
  },
  'sia-hill-of-crosses': {
    title: "File:Hill of Crosses 1, Siauliai, Lithuania.JPG",
    author: "Diliff",
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hill_of_Crosses_1,_Siauliai,_Lithuania.JPG',
    modified: false,
  },
};

export function getPhotoCredit(spotId: string): PhotoCredit | undefined {
  return PHOTO_CREDITS[spotId];
}
