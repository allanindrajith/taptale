import { ImageSourcePropType } from 'react-native';

export type AppLanguage = 'en' | 'lt';

export interface LocalizedText {
  en: string;
  lt?: string;
}

export type AnimationType = 'pulse' | 'confetti' | 'wave' | 'bloom' | 'orbit';

export interface AudioGuide {
  title: LocalizedText;
  narrator: LocalizedText;
  musicTrack: LocalizedText;
  duration: string;
}

export interface Spot {
  id: string;
  cityID: string;
  nfcSecretKey: string;
  title: LocalizedText;
  teaser: LocalizedText;
  imageUrl: ImageSourcePropType | string;
  durationMinutes: number;
  activities: LocalizedText[];
  story: LocalizedText[];
  secretLore?: LocalizedText[];
  audioGuide: AudioGuide;
  animation: AnimationType;
  colorHex: string;
  latitude: number;
  longitude: number;
}

export function getNfcPayload(spot: Spot): string {
  return `taptale://unlock?spot=${spot.id}&key=${spot.nfcSecretKey}`;
}

export interface City {
  id: string;
  name: LocalizedText;
}

export function resolveText(text: LocalizedText, lang: AppLanguage): string {
  if (lang === 'lt' && text.lt) return text.lt;
  return text.en;
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number, lang: AppLanguage = 'en'): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m ${lang === 'lt' ? 'atstumu' : 'away'}`;
  }
  return `${km.toFixed(1)} km ${lang === 'lt' ? 'atstumu' : 'away'}`;
}

export type TransportMode = 'walk' | 'bicycle' | 'transit' | 'car';

export interface RouteStep {
  instruction: LocalizedText;
  distance: string;
  icon: string;
}

export interface TravelEstimate {
  mode: TransportMode;
  minutes: number;
  label: LocalizedText;
  icon: string;
}

export function getTravelEstimates(distanceKm: number): TravelEstimate[] {
  // Walking: ~4.8 km/h -> 1 km is ~12.5 min
  const walkMin = Math.max(1, Math.round(distanceKm * 12.5));
  // Bicycle: ~15 km/h -> 1 km is ~4 min
  const bikeMin = Math.max(1, Math.round(distanceKm * 4));
  // Public transit: wait time + ~22 km/h
  const transitMin = distanceKm < 0.6 ? walkMin : Math.max(5, Math.round(4 + distanceKm * 3));
  // Car: city traffic
  const carMin = Math.max(2, Math.round(2 + distanceKm * 2.2));

  return [
    {
      mode: 'walk',
      minutes: walkMin,
      label: { en: 'Walk', lt: 'Pėsčiomis' },
      icon: '🚶',
    },
    {
      mode: 'bicycle',
      minutes: bikeMin,
      label: { en: 'Bicycle', lt: 'Dviračiu' },
      icon: '🚲',
    },
    {
      mode: 'transit',
      minutes: transitMin,
      label: { en: 'Public Transit', lt: 'Viešasis tr.' },
      icon: '🚌',
    },
    {
      mode: 'car',
      minutes: carMin,
      label: { en: 'Car / Taxi', lt: 'Automobiliu' },
      icon: '🚗',
    },
  ];
}

export function formatMinutes(mins: number, lang: AppLanguage = 'en'): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (lang === 'lt') {
      return m > 0 ? `${h} val. ${m} min.` : `${h} val.`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} ${lang === 'lt' ? 'min.' : 'min'}`;
}

export function getRouteSteps(spot: Spot, mode: TransportMode, distanceKm: number): RouteStep[] {
  const distStr = formatDistance(distanceKm);
  switch (mode) {
    case 'walk':
      return [
        {
          instruction: {
            en: 'Head south on historic Old Town pedestrian walkways toward the landmark.',
            lt: 'Pradėkite eiti senamiesčio pėsčiųjų taku link objekto.',
          },
          distance: '60 m',
          icon: '🚶',
        },
        {
          instruction: {
            en: `Follow Pilies g. and the designated cobblestone heritage corridor toward ${spot.title.en}.`,
            lt: `Keliaukite Pilies gatve paveldo koridoriumi link ${spot.title.lt || spot.title.en}.`,
          },
          distance: `${(distanceKm * 0.7).toFixed(1)} km`,
          icon: '➡️',
        },
        {
          instruction: {
            en: `Arrive at ${spot.title.en}. Locate the TapTale copper NFC plaque mounted on the entrance plinth.`,
            lt: `Atvykote prie ${spot.title.lt || spot.title.en}. Raskite TapTale varinę NFC lentelę prie įėjimo.`,
          },
          distance: 'Arrival',
          icon: '📍',
        },
      ];
    case 'bicycle':
      return [
        {
          instruction: {
            en: 'Follow the riverbank EuroVelo bike path toward Old Town perimeter.',
            lt: 'Važiuokite Neries pakrantės EuroVelo dviračių taku senamiesčio link.',
          },
          distance: '150 m',
          icon: '🚲',
        },
        {
          instruction: {
            en: `Continue on the cycling lane to the public bicycle racks at ${spot.title.en}.`,
            lt: `Važiuokite dviračių juosta iki stovų šalia ${spot.title.lt || spot.title.en}.`,
          },
          distance: distStr,
          icon: '➡️',
        },
        {
          instruction: {
            en: 'Park bike and walk the final 25 meters to tap the NFC plaque.',
            lt: 'Pastatykite dviratį ir prieikite 25 m priliesti NFC lentelę.',
          },
          distance: '25 m',
          icon: '📍',
        },
      ];
    case 'transit':
      return [
        {
          instruction: {
            en: 'Walk to the nearest bus stop (Arkikatedra or Karaliaus Mindaugo tiltas).',
            lt: 'Eikite iki artimiausios stotelės (Arkikatedra arba Karaliaus Mindaugo tiltas).',
          },
          distance: '120 m',
          icon: '🚶',
        },
        {
          instruction: {
            en: `Take Bus 10, 33, 89 or Trolleybus 2 toward ${spot.title.en} stop.`,
            lt: `Važiuokite 10, 33, 89 autobusu arba 2 troleibusu link stotelės prie ${spot.title.lt || spot.title.en}.`,
          },
          distance: distStr,
          icon: '🚌',
        },
        {
          instruction: {
            en: 'Alight and follow the pedestrian signs to the TapTale NFC spot plaque.',
            lt: 'Išlipkite ir sekite nuorodas iki TapTale NFC paveldo žymos.',
          },
          distance: '70 m',
          icon: '📍',
        },
      ];
    case 'car':
    default:
      return [
        {
          instruction: {
            en: 'Start navigation via Old Town access roads or Goštauto g.',
            lt: 'Važiuokite senamiesčio apvažiavimu arba Goštauto gatve.',
          },
          distance: '200 m',
          icon: '🚗',
        },
        {
          instruction: {
            en: `Drive toward the nearest public parking lot adjacent to ${spot.title.en}.`,
            lt: `Važiuokite iki artimiausios automobilių aikštelės prie ${spot.title.lt || spot.title.en}.`,
          },
          distance: distStr,
          icon: '➡️',
        },
        {
          instruction: {
            en: 'Park and walk to the monument to find the NFC tap plaque.',
            lt: 'Pastatykite automobilį ir prieikite prie NFC lentelės.',
          },
          distance: '50 m',
          icon: '📍',
        },
      ];
  }
}


export const CITIES: City[] = [
  {
    id: 'vln',
    name: { en: 'Vilnius', lt: 'Vilnius' },
  },
  {
    id: 'trk',
    name: { en: 'Trakai', lt: 'Trakai' },
  },
  {
    id: 'sia',
    name: { en: 'Šiauliai region', lt: 'Šiaulių regionas' },
  },
];

export const SPOTS: Spot[] = [
  {
    id: 'vln-gediminas-tower',
    cityID: 'vln',
    nfcSecretKey: 'VILKAS-1323',
    title: {
      en: "Gediminas' Tower",
      lt: 'Gedimino pilies bokštas',
    },
    teaser: {
      en: 'Where the legend of Vilnius and the Iron Wolf begins.',
      lt: 'Kur prasideda Vilniaus ir Geležinio vilko legenda.',
    },
    imageUrl: require('../../assets/images/gediminas_tower.jpg'),
    durationMinutes: 45,
    activities: [
      {
        en: 'Climb to the top observation deck for 360° views of Vilnius Old Town.',
        lt: 'Užlipkite į apžvalgos aikštelę ir pasigrožėkite 360° senamiesčio panorama.',
      },
      {
        en: 'Inspect medieval Baltic weapons, chainmail, and castle foundation models.',
        lt: 'Apžiūrėkite viduramžių ginklus, šarvus ir pilies maketus muziejuje.',
      },
      {
        en: 'Ride the historical hillside funicular railway or hike the cobbled trail.',
        lt: 'Pakilkite istoriniu keltuvu arba pasivaikščiokite grįstu taku.',
      },
    ],
    story: [
      {
        en: 'Legend says Grand Duke Gediminas was hunting in Šventaragis Valley and slept on this hill. He dreamed of an immense iron wolf howling with the voices of a hundred wolves.',
        lt: 'Pasak legendos, Didysis kunigaikštis Gediminas medžiojo Šventaragio slėnyje ir užmigo ant kalno. Jis susapnavo didžiulį geležinį vilką, staugiantį tarsi šimtas vilkų.',
      },
      {
        en: 'His chief pagan priest, Lizdeika, interpreted: A glorious capital city will stand here, and its fame will echo throughout the civilized world. Thus Vilnius was born in 1323.',
        lt: 'Krivis Lizdeika išaiškino: čia iškils galinga sostinė, kurios garsas sklis plačiai po visą pasaulį. Taip 1323 metais gimė Vilnius.',
      },
      {
        en: 'The surviving red-brick tower was completed by Vytautas the Great in 1409. The Lithuanian tricolor flag was hoisted here on January 1, 1919, cementing it as the nation’s symbol of resilience.',
        lt: 'Išlikusį bokštą 1409 m. baigė statyti Vytautas Didysis. 1919 m. sausio 1 d. čia pirmą kartą iškelta Lietuvos trispalvė.',
      },
    ],
    secretLore: [
      {
        en: 'Secret Archival Note: Beneath the castle hill lie sealed escape tunnels connecting the Upper Castle directly to the Lower Castle palace cellars.',
        lt: 'Slaptas archyvo įrašas: Po kalnu slypi užmūryti slaptieji tuneliai, jungę Aukštutinę pilį su Valdovų rūmų rūsiais.',
      },
    ],
    audioGuide: {
      title: {
        en: 'The Cry of the Iron Wolf: Prophecy of Grand Duke Gediminas',
        lt: 'Geležinio vilko staugimas: Gedimino pranašystė',
      },
      narrator: {
        en: 'Vytautas Rumšas (Archival Voice)',
        lt: 'Vytautas Rumšas (Archyvinis balsas)',
      },
      musicTrack: {
        en: 'Ancient Baltic Horns & Kanklės Drone',
        lt: 'Senosios baltiškos daudytės ir kanklių garsai',
      },
      duration: '3:45',
    },
    animation: 'orbit',
    colorHex: '#1d5c38',
    latitude: 54.6869,
    longitude: 25.2911,
  },
  {
    id: 'vln-cathedral-square',
    cityID: 'vln',
    nfcSecretKey: 'STEBUKLAS-1989',
    title: {
      en: 'Cathedral Square',
      lt: 'Katedros aikštė',
    },
    teaser: {
      en: 'The civic, spiritual, and patriotic heart of Lithuania.',
      lt: 'Vilniaus ir visos Lietuvos dvasinė ir pilietinė širdis.',
    },
    imageUrl: require('../../assets/images/cathedral_square.jpg'),
    durationMinutes: 40,
    activities: [
      {
        en: "Find the 'STEBUKLAS' ('Miracle') tile on the pavement, step on it, and spin clockwise 3 times to make a wish.",
        lt: 'Raskite plytelę „STEBUKLAS“, atsistokite ant jos ir apsisukite 3 kartus sugalvoję norą.',
      },
      {
        en: 'Climb the 52-meter standalone Bell Tower for an overhead view of Gediminas Avenue.',
        lt: 'Užlipkite į 52 metrų varpinės bokštą pasigrožėti Gedimino prospektu.',
      },
      {
        en: 'Explore the subterranean Royal Crypts where Grand Dukes and Queen Barbara Radziwiłł rest.',
        lt: 'Aplankykite Katedros požemius, kur ilsisi Lietuvos valdovai ir Barbora Radvilaitė.',
      },
    ],
    story: [
      {
        en: 'Cathedral Square sits where the pagan temple of Perkūnas, god of thunder, once held an eternal sacred flame tended by vestal virgins.',
        lt: 'Katedros aikštė stovi buvusios pagonių dievo Perkūno šventovės vietoje, kur amžinąją ugnį saugojo vaidilutės.',
      },
      {
        en: 'On August 23, 1989, this square was the anchor of the Baltic Way — a human chain of 2 million people holding hands across 675 km from Vilnius to Tallinn demanding freedom.',
        lt: '1989 m. rugpjūčio 23 d. ši aikštė tapo Baltijos kelio pradžia – 2 milijonai žmonių susikibo rankomis per 675 km iki Talino.',
      },
    ],
    secretLore: [
      {
        en: 'Hidden under the altar steps is Lithuania’s oldest known fresco, dating back to the late 14th century, depicting the crucifixion.',
        lt: 'Po altoriaus laiptais slypi seniausia Lietuvos freska iš XIV a. pabaigos, vaizduojanti Nukryžiuotąjį.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Bells of Freedom: From Perkūnas Flame to Baltic Way',
        lt: 'Laisvės varpai: Nuo Perkūno ugnies iki Baltijos kelio',
      },
      narrator: {
        en: 'Elena Bradūnaitė (Folklorist)',
        lt: 'Elena Bradūnaitė (Folkloristė)',
      },
      musicTrack: {
        en: 'Cathedral Bells & Sacred Choral Hymn',
        lt: 'Katedros varpų sąskambiai ir chorinė giesmė',
      },
      duration: '4:12',
    },
    animation: 'pulse',
    colorHex: '#1d5c38',
    latitude: 54.6858,
    longitude: 25.2878,
  },
  {
    id: 'vln-gate-of-dawn',
    cityID: 'vln',
    nfcSecretKey: 'MEDININKAI-1503',
    title: {
      en: 'Gate of Dawn',
      lt: 'Aušros Vartai',
    },
    teaser: {
      en: 'Sole surviving city gate and venerated sacred pilgrimage shrine.',
      lt: 'Vieninteliai išlikę gynybiniai miesto vartai ir šventovė.',
    },
    imageUrl: require('../../assets/images/gate_of_dawn.jpg'),
    durationMinutes: 30,
    activities: [
      {
        en: 'Gaze up at the golden chapel window from the pedestrian street to see the Miraculous Virgin.',
        lt: 'Iš gatvės pažvelkite į auksinį koplyčios langą su stebuklinguoju Marijos paveikslu.',
      },
      {
        en: 'Climb the stone stairs into the chapel lined with thousands of silver ex-voto offerings.',
        lt: 'Užlipkite į koplyčią, kurios sienos nusėtos tūkstančiais sidabrinių votų.',
      },
      {
        en: 'Walk around the exterior facade to examine the defensive loopholes and the Polish-Lithuanian coat of arms.',
        lt: 'Apžiūrėkite išorinį fasadą su šaudymo angomis ir Vyties herbu.',
      },
    ],
    story: [
      {
        en: 'Constructed between 1503 and 1522 as part of the defensive stone wall commissioned by Grand Duke Alexander, this was the southern portal guarding the road to Medininkai and Krakow.',
        lt: 'Pastatyti tarp 1503 ir 1522 m. kaip Aleksandro Jogailaičio inicijuotos gynybinės sienos vartai, saugoję pietinį kelią į Medininkus ir Krokuvą.',
      },
      {
        en: 'The painting of the Blessed Virgin Mary, Mother of Mercy, was crowned by Pope Pius XI in 1927. During wartime, both Catholics and Orthodox believers gathered together in peace beneath its arch.',
        lt: 'Švč. Mergelės Marijos, Gailestingumo Motinos, paveikslas 1927 m. karūnuotas popiežiaus Pijaus XI. Čia taikiai meldžiasi viso pasaulio krikščionys.',
      },
    ],
    secretLore: [
      {
        en: 'The painting is made on 8 oak boards. X-ray analysis revealed that an earlier tempera masterpiece from the 16th century lies preserved beneath the gold dress.',
        lt: 'Paveikslas nutapytas ant 8 ąžuolinių lentų. Rentgeno tyrimai atskleidė, kad po auksiniu aptaisu slypi ankstyvesnis XVI a. tapybos sluoksnis.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Silver Hearts: The Miracles of the Dawn Archway',
        lt: 'Sidabro širdys: Aušros Vartų stebuklai',
      },
      narrator: {
        en: 'Father Gintaras Grušas',
        lt: 'Kun. Gintaras Grušas',
      },
      musicTrack: {
        en: 'Baroque Organ Prelude & Gregorian Chant',
        lt: 'Barokiniai vargonai ir Grigališkasis choralas',
      },
      duration: '3:15',
    },
    animation: 'bloom',
    colorHex: '#1d5c38',
    latitude: 54.6743,
    longitude: 25.2898,
  },
  {
    id: 'vln-university',
    cityID: 'vln',
    nfcSecretKey: 'ALMAMATER-1579',
    title: {
      en: 'Vilnius University',
      lt: 'Vilniaus universitetas',
    },
    teaser: {
      en: 'Northern European beacon of science, astronomy, and poetry since 1579.',
      lt: 'Mokslo, astronomijos ir poezijos židinys nuo 1579 m.',
    },
    imageUrl: require('../../assets/images/vilnius_university.jpg'),
    durationMinutes: 60,
    activities: [
      {
        en: 'Wander through all 13 interconnected baroque, renaissance, and classical courtyards.',
        lt: 'Pereikite per visus 13 tarpusavyje sujungtų renesanso ir baroko kiemelių.',
      },
      {
        en: 'Visit the Astronomical Observatory Courtyard with its zodiac emblems designed in 1753.',
        lt: 'Aplankykite 1753 m. observatorijos kiemelį su zodiako ženklais.',
      },
      {
        en: 'Step into St. Johns’ Church to admire the tallest bell tower in Vilnius Old Town (68 m).',
        lt: 'Užeikite į Šv. Jonų bažnyčią ir pakilkite į aukščiausią senamiesčio varpinę (68 m).',
      },
    ],
    story: [
      {
        en: 'Founded in 1579 by King Stephen Báthory and Jesuit scholars, it is one of the oldest universities in Central and Eastern Europe.',
        lt: 'Įkurtas 1579 m. Stepono Batoro ir jėzuitų ordino, tai vienas seniausių universitetų visoje Vidurio ir Rytų Europoje.',
      },
      {
        en: 'Famous alumni include the romantic poet Adam Mickiewicz and Nobel Prize laureate Czesław Miłosz, who studied law in these ancient halls.',
        lt: 'Čia studijavo poetas Adomas Mickevičius, Nobelio premijos laureatas Česlovas Milošas ir žymiausi Lietuvos šviesuoliai.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Wisdom in Stone: 450 Years of Scholastic Mastery',
        lt: 'Išmintis akmenyje: 450 metų mokslo istorija',
      },
      narrator: {
        en: 'Prof. Alfredas Bumblauskas',
        lt: 'Prof. Alfredas Bumblauskas',
      },
      musicTrack: {
        en: 'Renaissance Harpsichord & Scholastic Strings',
        lt: 'Renesanso klavesinas ir akademinės stygos',
      },
      duration: '4:40',
    },
    animation: 'wave',
    colorHex: '#1d5c38',
    latitude: 54.6825,
    longitude: 25.2877,
  },
  {
    id: 'vln-uzupis',
    cityID: 'vln',
    nfcSecretKey: 'UZUPIS-1997',
    title: {
      en: 'Republic of Užupis',
      lt: 'Užupio Respublika',
    },
    teaser: {
      en: 'Independent bohemian enclave of artists, philosophers, and cats.',
      lt: 'Laisvoji menininkų, filosofų ir katinų respublika.',
    },
    imageUrl: require('../../assets/images/uzupis.jpg'),
    durationMinutes: 50,
    activities: [
      {
        en: 'Read the 41 humorous and profound articles of the Užupis Constitution on Paupio Street.',
        lt: 'Perskaitykite 41 Užupio konstitucijos punktą Paupio gatvės veidrodinėse lentose.',
      },
      {
        en: 'Touch the bronze Užupis Mermaid sitting in the stone niche under the bridge.',
        lt: 'Pasisveikinkite su Užupio undinėle, sėdinčia nišoje po tiltu.',
      },
      {
        en: 'Get your passport stamped with the unofficial Užupis Republic stamp at the border post bar.',
        lt: 'Užsidėkite Užupio Respublikos antspaudą pase vietos pasienio užeigoje.',
      },
    ],
    story: [
      {
        en: "On April Fool's Day 1997, local artists and free-thinkers declared their bohemian district across the Vilnele River an independent micro-nation with its own anthem, currency, and president.",
        lt: '1997 m. balandžio 1-ąją menininkai paskelbė Užupio Respubliką su savo vėliava, himnu, valiuta ir 12 narių armija.',
      },
      {
        en: "Their bronze Angel of Užupis, blowing a golden trumpet on the main square, symbolizes the rebirth of art and spiritual freedom.",
        lt: 'Pagrindinėje aikštėje trimituojantis Užupio angelas simbolizuoja kūrybos ir laisvės atgimimą.',
      },
    ],
    secretLore: [
      {
        en: 'Article 13 of the Constitution: "A cat is not obliged to love its owner, but must help in time of need." The Dalai Lama is an honorary citizen.',
        lt: '13 konstitucijos straipsnis: „Katė neprivalo mylėti savo šeimininko, bet sunkią akimirką privalo jam padėti.“ Dalai Lama yra garbės pilietis.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Right to Be a Dog: The Spirit of Užupis Bohemian Revolution',
        lt: 'Teisė būti šunimi: Užupio dvasia ir bohema',
      },
      narrator: {
        en: 'Romas Lileikis (President of Užupis)',
        lt: 'Romas Lileikis (Užupio Respublikos Prezidentas)',
      },
      musicTrack: {
        en: 'Acoustic Guitar & Vilnelė River Water Rhythms',
        lt: 'Akustinė gitara ir Vilnelės srovės šnaresys',
      },
      duration: '3:50',
    },
    animation: 'confetti',
    colorHex: '#1d5c38',
    latitude: 54.6802,
    longitude: 25.2948,
  },
  {
    id: 'trk-island-castle',
    cityID: 'trk',
    nfcSecretKey: 'GALVE-1409',
    title: {
      en: 'Trakai Island Castle',
      lt: 'Trakų salos pilis',
    },
    teaser: {
      en: 'Gothic red-brick medieval water stronghold on Lake Galvė.',
      lt: 'Gotikinė XIV–XV a. vandens pilis Galvės ežere.',
    },
    imageUrl: require('../../assets/images/trakai_castle.jpg'),
    durationMinutes: 90,
    activities: [
      {
        en: 'Walk across the wooden bridges over Lake Galvė into the defensive courtyard.',
        lt: 'Pereikite mediniais tiltais per Galvės ežerą į gynybinį kiemą.',
      },
      {
        en: 'Taste fresh traditional Karaim mutton kibinai pastries at authentic lakeside taverns.',
        lt: 'Paragaukite tradicinių karaimų kibinų ežero pakrantės smuklėse.',
      },
      {
        en: 'Rent a sailboat or paddleboat to encircle the castle walls from the water.',
        lt: 'Išsinuomokite valtį ar irklentę ir apiplaukite pilį ežero bangomis.',
      },
    ],
    story: [
      {
        en: 'Constructed in the 14th century by Kęstutis and completed by his son Vytautas the Great, Trakai is one of the only island castles in all of Eastern Europe.',
        lt: 'Pradėta statyti Kęstučio ir baigta Vytauto Didžiojo, Trakų pilis yra vienintelė tokia salos tvirtovė visoje Rytų Europoje.',
      },
      {
        en: 'Grand Duke Vytautas brought Crimean Karaims here in 1397 as his trusted imperial bodyguards and craftsmen, preserving their Turkic heritage to this day.',
        lt: 'Vytautas Didysis 1397 m. iš Krymo atsivežė karaimus, kurie saugojo valdovą ir iki šiol puoselėja savo unikalią kultūrą.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Fortress in the Waves: Vytautas and the Karaim Legacy',
        lt: 'Tvirtovė bangose: Vytauto ir karaimų palikimas',
      },
      narrator: {
        en: 'Audronė Kaukėnaitė (Trakai Historian)',
        lt: 'Audronė Kaukėnaitė (Trakų istorikė)',
      },
      musicTrack: {
        en: 'Medieval Kettle Drums & Lake Galvė Wind Ambience',
        lt: 'Viduramžių būgnai ir Galvės ežero vėjo garsai',
      },
      duration: '4:20',
    },
    animation: 'wave',
    colorHex: '#1d5c38',
    latitude: 54.6524,
    longitude: 24.9339,
  },
  {
    id: 'sia-hill-of-crosses',
    cityID: 'sia',
    nfcSecretKey: 'KRYZIAI-1831',
    title: {
      en: 'Hill of Crosses',
      lt: 'Kryžių kalnas',
    },
    teaser: {
      en: 'World-renowned sanctuary of unwavering faith and peaceful resistance.',
      lt: 'Visame pasaulyje garsus nepalaužiamo tikėjimo ir laisvės kalnas.',
    },
    imageUrl: require('../../assets/images/hill_of_crosses.jpg'),
    durationMinutes: 60,
    activities: [
      {
        en: 'Walk through the winding narrow pathways between more than 100,000 crosses.',
        lt: 'Praeikite takeliais tarp daugiau nei 100 000 įvairiausių kryžių.',
      },
      {
        en: 'Leave your own small wooden cross inscribed with a wish or prayer.',
        lt: 'Palikite savo medinį kryželį su malda ar asmeniniu palinkėjimu.',
      },
      {
        en: 'Visit the Franciscan Monastery built nearby following the visit of Pope John Paul II in 1993.',
        lt: 'Aplankykite pranciškonų vienuolyną, pastatytą po popiežiaus Jono Pauliaus II vizito.',
      },
    ],
    story: [
      {
        en: 'People began planting crosses on this former hill fort after the 1831 and 1863 Uprisings against Tsarist Russian oppression to honor relatives whose bodies were never recovered.',
        lt: 'Kryžius čia pradėta statyti po 1831 ir 1863 m. sukilimų prieš carinės Rusijos priespaudą, pagerbiant žuvusius artimuosius.',
      },
      {
        en: 'During Soviet times, the hill was bulldozed at least five times, and burning crosses were dumped into ditches. Each night, under cover of darkness, locals planted new ones.',
        lt: 'Sovietmečiu kalnas buvo nulygintas buldozeriais bent penkis kartus. Tačiau naktimis žmonės vėl slapta nešė ir statė naujus kryžius.',
      },
    ],
    audioGuide: {
      title: {
        en: 'The Unconquered Knoll: 100,000 Whispers of Hope',
        lt: 'Nenugalėtas kalnas: 100 000 vilties šnabždesių',
      },
      narrator: {
        en: 'Brother Juozapas (Franciscan Order)',
        lt: 'Brolis Juozapas (Pranciškonų ordinas)',
      },
      musicTrack: {
        en: 'Wind Chimes of Rosaries & Meditative Strings',
        lt: 'Rožinių dzingėjimas vėjyje ir ramybės stygos',
      },
      duration: '5:02',
    },
    animation: 'bloom',
    colorHex: '#1d5c38',
    latitude: 56.0153,
    longitude: 23.4164,
  },
];
