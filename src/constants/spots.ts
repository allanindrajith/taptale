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

export function getNfcPayload(spot: Spot, domain?: string): string {
  if (domain) {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${cleanDomain}/unlock?spot=${spot.id}&key=${spot.nfcSecretKey}`;
  }
  return `taptale://unlock?spot=${spot.id}&key=${spot.nfcSecretKey}`;
}

export function getNfcWebUrl(spot: Spot, domain: string = 'taptale.app'): string {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${cleanDomain}/unlock?spot=${spot.id}&key=${spot.nfcSecretKey}`;
}

export interface City {
  id: string;
  name: LocalizedText;
}

export function resolveText(text?: LocalizedText | null, lang: AppLanguage = 'en'): string {
  if (!text) return '';
  if (lang === 'lt' && text.lt) return text.lt;
  return text.en || text.lt || '';
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
    id: 'kns',
    name: { en: 'Kaunas', lt: 'Kaunas' },
  },
  {
    id: 'plg',
    name: { en: 'Palanga', lt: 'Palanga' },
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
        en: "In the year 1323, Grand Duke Gediminas journeyed into the primeval oak forests of Šventaragis Valley on a royal hunt. As twilight descended, he made camp on a steep wooded hill where the rushing Vilnia River meets the Neris. That night, Gediminas had a vivid, thunderous dream: atop the crest stood a gigantic wolf forged entirely of iron, howling toward the heavens with the fierce voices of a hundred wolves. Stricken by wonder, Gediminas summoned his chief pagan high priest, Lizdeika the Wise, who divined the gods' message: 'O Grand Duke, an invincible capital shall rise upon this crest, whose glory, bravery, and renown shall echo to the ends of the civilized earth.' Thus, Vilnius was born.",
        lt: '1323 metais Didysis kunigaikštis Gediminas medžiojo sengirėse Šventaragio slėnyje. Nusileidus sutemoms, valdovas apsistojo ant aukšto kalno ties Vilnios ir Neries santaka. Tą naktį Gediminas susapnavo didžiulį vilką, tarsi iš geležies nukaltą, kuris staugė tarsi šimtas vilkų. Pabudęs valdovas pakvietė vyriausiąjį pagonių krivį Lizdeiką, kuris išaiškino dievų valią: čia iškils galinga ir neįveikiama sostinė, kurios šlovė ir garsas sklis plačiai po visą pasaulį. Taip gimė Vilnius.',
      },
      {
        en: "The original wooden fortifications withstood relentless Teutonic Crusader sieges, but it was Gediminas' grandson, Vytautas the Great, who transformed the Upper Castle into an impenetrable gothic citadel of red brick following the historic victory at the Battle of Grunwald in 1410. Enclosed by thick defensive curtain walls, octagonal watchtowers, and deep dry moats, this upper redoubt sheltered the grand ducal court and state treasury. Subterranean stone tunnels were carved deep into the hill, connecting the upper ramparts directly to the Lower Castle palace cellars.",
        lt: 'Pradinė medinė tvirtovė atlaikė daugybę kryžiuočių apgulčių, tačiau Gedimino anūkas Vytautas Didysis po Žalgirio mūšio perstatė Aukštutinę pilį į neįveikiamą raudonų gotikinių plytų citadelę. Apsupta storų gynybinių sienų, aštuoniakampių gynybos bokštų ir gilių griovių, ši tvirtovė saugojo valdovo iždą ir archyvus. Kalno gelmėse buvo iškasti slapti mūriniai tuneliai, jungę viršutinę citadelę su Valdovų rūmų rūsiais.',
      },
      {
        en: "Over the centuries, the castle endured foreign invasions, devastating fires, and the brutal Muscovite occupation of 1655, leaving only this solitary western tower standing. Yet it became the beating spiritual heart of Lithuania's struggle for sovereignty. On the foggy dawn of January 1st, 1919, a brave detachment of ten Lithuanian volunteers led by Commander Kazys Škirpa climbed the hill under heavy hostile fire and hoisted the yellow, green, and red national Tricolor for the very first time in history.",
        lt: 'Per amžius pilis išgyveno karus, gaisrus ir 1655 m. Maskvos okupacijos nusiaubimą, po kurio išliko tik šis vakarinis bokštas. Tačiau jis tapo nepalaužiamos laisvės dvasios simboliu. 1919 m. sausio 1-osios aušrą dešimt Lietuvos savanorių, vadovaujami Kazio Škirpos, nepabūgę pavojaus užlipo į kalną ir pirmą kartą istorijoje iškėlė nepriklausomos Lietuvos trispalvę.',
      },
      {
        en: "During the dark decades of Soviet totalitarian rule, the sight of the bare tower was a silent reminder of freedom stolen. In October 1988, as the peaceful Singing Revolution swept the nation, hundreds of thousands of citizens gathered with tears in their eyes as the Tricolor was triumphantly restored atop the tower. Today, Gediminas' Tower stands as an eternal guardian over Vilnius Old Town, welcoming travelers and reminding the world of a people who never surrendered their heritage.",
        lt: 'Sovietmečiu nukabinta vėliava priminė atimtą laisvę. 1988 m. spalį, prasidėjus Sąjūdžiui ir Dainuojančiai revoliucijai, šimtatūkstantinė minia su ašaromis akyse vėl iškėlė trispalvę. Šiandien Gedimino pilies bokštas išdidžiai saugo Vilniaus senamiestį ir liudija tautos stiprybę bei nepalaužiamą laisvės troškimą.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In 2017, geological shifts on the castle slopes led archaeologists to uncover the secret burial site of 20 rebel leaders from the 1863 Uprising against Tsarist Russia, including legendary heroes Konstantinas Kalinauskas and Zigmantas Sierakauskas, secretly interred by imperial forces with their hands bound behind their backs.',
        lt: 'Išskirtinis archyvinis faktas: 2017 m. tvarkant kalno šlaitus, archeologai netikėtai atrado slaptą 1863 m. sukilimo vadų kapavietę, kurioje caro valdžia buvo slapta užkasusi Konstantino Kalinausko ir Zigmanto Sierakausko palaikus surištomis rankomis.',
      },
    ],
    audioGuide: {
      title: {
        en: 'The Cry of the Iron Wolf: Complete Chronicle of Gediminas Castle',
        lt: 'Geležinio vilko šauksmas: Pilna Gedimino pilies kronika',
      },
      narrator: {
        en: 'Vytautas Rumšas (National Theatre Narrator)',
        lt: 'Vytautas Rumšas (Nacionalinio teatro aktorius)',
      },
      musicTrack: {
        en: 'Ancient Baltic Horns & Kanklės Drone',
        lt: 'Senosios baltiškos daudytės ir kanklių garsai',
      },
      duration: '5:45',
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
        en: 'Long before grand Christian porticos rose against the Vilnius sky, this sacred ground was the Pagan Valley of Šventaragis. Here, nestled between the winding river and the forested hill, burned an eternal sacred flame in honor of Perkūnas, the Baltic god of thunder and justice. Day and night, Baltic priests known as Kriviai and holy vestal virgins, the Vaidilutės, fed the sacred oak fire, seeking divine protection for the rulers and hunters of the realm.',
        lt: 'Ilgai prieš iškylant krikščioniškiems skliautams, ši vieta buvo šventasis Šventaragio slėnis. Čia, upių santakoje, liepsnojo amžinoji ugnis Perkūnui – baltų griaustinio ir teisingumo dievui. Dieną ir naktį pagonių dvasininkai kriviai ir vaidilutės kūreno ąžuolų malkas, melsdami dievų globos ir derlingumo visai krašto žemei.',
      },
      {
        en: 'With the baptism of Lithuania in 1387 by Grand Duke Jogaila, the pagan altar made way for the first stone cathedral. Over the following four centuries, devastating fires and wartime sieges consumed successive gothic and baroque basilicas. Finally, in 1783, Lithuania’s visionary neoclassical master architect, Laurynas Gucevičius, undertook a total reimagining. Inspired by the temples of classical antiquity, he raised the monumental Doric colonnade and adorned the facade with heroic statues of Saint Casimir, Saint Helena holding the golden cross, and Saint Stanislaus.',
        lt: '1387 m. krikštijantis Lietuvai, Didysis kunigaikštis Jogaila Perkūno šventyklos vietoje pastatė pirmąją mūrinę katedrą. Per keturis šimtmečius pastatas ne kartą degė ir buvo perstatytas, kol 1783 m. genialus lietuvių architektas Laurynas Gucevičius sukūrė dabartinį šedevrą. Įkvėptas antikinės didybės, jis suprojektavo didingą dorėninių kolonų portiką su šventųjų Kazimiero, Elenos ir Stanislovo skulptūromis.',
      },
      {
        en: 'Beneath the polished marble pavement of the cathedral lies a vast royal necropolis. In these silent subterranean crypts rest the founders of the nation: Grand Duke Alexander Jagiellon, the heart of Polish King and Lithuanian Grand Duke Władysław IV Vasa, and Queen Barbara Radziwiłł—renowned as Europe’s most captivating renaissance beauty, whose forbidden, passionate love with King Sigismund Augustus scandalized the nobility and forever marked Lithuanian romantic lore.',
        lt: 'Po Katedros marmuro grindimis slypi karališkieji požemiai ir kriptos. Čia amžinojo poilsio atgulė Lietuvos didieji kunigaikščiai: Aleksandras Jogailaitis, valdovo Vladislovo IV Vazos širdis bei karalienė Barbora Radvilaitė – viena gražiausių Europos Renesanso moterų, kurios tragiška meilės istorija su Žygimantu Augustu tapo nemirtinga legenda.',
      },
      {
        en: "Cathedral Square is the beating civic heart of Lithuanian freedom. On August 23rd, 1989, this square served as the starting point of the miraculous Baltic Way—a human chain of two million people holding hands across 675 kilometers through Latvia to Estonia, singing hymns of peaceful resistance against Soviet tyranny. Just outside the 52-meter standalone Bell Tower, look for the inscribed 'STEBUKLAS' (Miracle) paving tile: stand upon it, make a wish for peace, and turn clockwise three times to seal the ancient blessing.",
        lt: 'Katedros aikštė yra visos Lietuvos laisvės širdis. 1989 m. rugpjūčio 23 d. iš čia prasidėjo legendinis Baltijos kelias – 2 milijonai žmonių susikibo rankomis per 675 kilometrus iki Talino, gindami savo teisę į laisvę. Aikštėje šalia 52 metrų varpinės rasite plytelę „STEBUKLAS“: atsistokite ant jos, sugalvokite norą ir apsisukite tris kartus pagal laikrodžio rodyklę.',
      },
    ],
    secretLore: [
      {
        en: "Exclusive Archival Secret: During 1931 flood excavations beneath the Chapel of Saint Casimir, restoration teams discovered the long-lost royal vault. Hidden behind a secret double wall lay the remains of King Alexander and Barbara Radziwiłł, alongside Lithuania's oldest surviving fresco dating from the late 14th century.",
        lt: 'Išskirtinis archyvinis faktas: 1931 m. potvynio metu po Šv. Kazimiero koplyčia atliekant gelbėjimo darbus, už slaptos dvigubos sienos buvo netikėtai atrasti dingusieji Barboros Radvilaitės ir Aleksandro Jogailaičio palaikai bei seniausia XIV a. pabaigos freska Lietuvoje.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Bells of Freedom: From Perkūnas Flame to the Baltic Way',
        lt: 'Laisvės varpai: Nuo Perkūno ugnies iki Baltijos kelio',
      },
      narrator: {
        en: 'Elena Bradūnaitė (Lithuanian Heritage Narrator)',
        lt: 'Elena Bradūnaitė (Paveldo pasakotoja)',
      },
      musicTrack: {
        en: 'Cathedral Bells & Sacred Choral Hymn',
        lt: 'Katedros varpų sąskambiai ir chorinė giesmė',
      },
      duration: '6:10',
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
        en: 'Between 1503 and 1522, as aggressive Crimean Tatar hordes raided the southern borders of the Grand Duchy, Grand Duke Alexander ordered the construction of a massive stone defensive wall encircling the entire city of Vilnius. Fitted with ten defensive gates and five rounded artillery bastions, the southern portal was originally christened the Medininkai Gate, standing guard over the strategic military and merchant highway leading to Medininkai Castle and Krakow.',
        lt: 'Tarp 1503 ir 1522 m., kylant totorių antpuolių grėsmei, Didysis kunigaikštis Aleksandras įsakė apjuosti Vilnių galinga akmenine gynybine siena su devyneriais vartais. Šie pietiniai vartai, iš pradžių vadinti Medininkų vartais, saugojo strategiškai svarbų prekybos ir karinį kelią, vedantį link Medininkų pilies ir Krokuvos.',
      },
      {
        en: 'It was custom across medieval Europe to paint holy protectors above town gates to ward off invaders and plague. Around 1620, an anonymous Vilnius master painted an extraordinary tempera icon of the Blessed Virgin Mary upon eight solid oak planks. Unusually depicted without the Child Jesus, she bows her head in gentle, sorrowful contemplation, hands crossed upon her chest. Soon, rumors of miraculous defenses spread—soldiers recounted cannonballs rebounding off the gatehouse walls, and fires mysteriously dying before reaching the chapel.',
        lt: 'Pagal viduramžių paprotį virš miesto vartų buvo kabinami šventųjų atvaizdai apsaugai nuo priešų ir maro. Apie 1620 m. nežinomas meistras ant 8 ąžuolinių lentų nutapė Švč. Mergelės Marijos, Gailestingumo Motinos, paveikslą. Ji pavaizduota be kūdikio, sukryžiavusi rankas ant krūtinės. Greitai pasklido žinia apie stebuklus: pasakojama, kad priešų kulkos atšokdavo nuo vartų, o ligoniai čia pat pasveikdavo.',
      },
      {
        en: 'In the 18th century, Discalced Carmelite monks built the exquisite baroque chapel directly over the arched gateway, allowing pilgrims in the street below to gaze up into the luminous sanctuary. Through centuries of foreign partitions, revolutions, and wars, the Gate of Dawn became a revered sanctuary of peaceful unity—one of the only holy places on Earth where Roman Catholics, Greek Catholics, and Eastern Orthodox faithful gathered side-by-side beneath the archway, offering prayers and silver ex-voto hearts in gratitude for life.',
        lt: 'XVIII a. basieji karmelitai tiesiai virš vartų arkos pastatė barokinę koplyčią. Per karus ir okupacijas Aušros Vartai tapo unikalia dvasinės vienybės vieta: po šiais skliautais petys į petį taikiai meldėsi ir katalikai, ir stačiatikiai. Koplyčios sienos pasidengė tūkstančiais sidabrinių votų – tikinčiųjų padėkos širdelių už išgelbėtas gyvybes.',
      },
      {
        en: 'The sacred image was solemnly crowned by Pope Pius XI in 1927 with gold papal crowns, proclaimed as the Mother of Mercy. From kings and tsars to romantic poet Adam Mickiewicz—who immortalized the gate in the opening stanzas of his epic masterpiece Pan Tadeusz—generations have looked up to this gateway. Even today, pedestrians hushed in silence remove their hats as they walk beneath the arch, continuing a half-millennium tradition of quiet reverence.',
        lt: '1927 m. popiežius Pijus XI paveikslą vainikavo popiežiškomis karūnomis kaip Gailestingumo Motiną. Poetas Adomas Mickevičius nemirtingomis eilėmis apdainavo Aušros Vartus epo „Ponas Tadas“ įžangoje. Ir šiandien praeiviai, eidami pro vartų arką, pagarbiai nusiima kepures, tęsdami penkių šimtų metų tradiciją.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Advanced multispectral imaging revealed that behind the 17th-century golden silver dress lies an earlier Renaissance painting. Hidden micro-engravings on the oak planks suggest the original painter may have been influenced by Lucas Cranach the Elder’s imperial court workshop.',
        lt: 'Išskirtinis archyvinis faktas: Rentgeno ir infraraudonųjų spindulių tyrimai parodė, kad po auksiniu sidabro aptaisu slypi ankstyvesnis renesansinis tapybos sluoksnis, galimai sukurtas Luko Kranacho Vyresniojo dvaro meistrų įtakoje.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Silver Hearts: Miracles and History of the Dawn Archway',
        lt: 'Sidabro širdys: Aušros Vartų istorija ir stebuklai',
      },
      narrator: {
        en: 'Father Gintaras Grušas (Archbishop of Vilnius)',
        lt: 'Arkivyskupas Gintaras Grušas',
      },
      musicTrack: {
        en: 'Baroque Organ Prelude & Gregorian Chant',
        lt: 'Barokiniai vargonai ir Grigališkasis choralas',
      },
      duration: '5:15',
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
        en: 'In 1579, King Stephen Báthory granted a royal charter elevating the Jesuit College of Vilnius into an Academy and University, confirmed with a papal bull from Pope Gregory XIII. It became the easternmost and northernmost bastion of European renaissance science, Latin poetry, and theological mastery, attracting renowned scholars, mathematicians, and cartographers from across Germany, Italy, England, and Scandinavia.',
        lt: '1579 metais Lenkijos karalius ir Lietuvos didysis kunigaikštis Steponas Batoras savo privilegija įkūrė Vilniaus jėzuitų akademiją ir universitetą, kurį patvirtino popiežius Grigalius XIII. Tai tapo šiauriausiu ir ryčiausiu Europos mokslo ir laisvosios minties židiniu, pritraukusiu profesorius iš visos Europos.',
      },
      {
        en: 'Wandering through the university is an unforgettable journey across four centuries of European architecture. Thirteen interconnected courtyards weave together gothic brick vaults, renaissance loggias, baroque arcades, and neoclassical facades. In the Astronomical Observatory Courtyard, founded in 1753 by astronomer Martin Poczobutt, classical white pediments are adorned with painted zodiac constellations, celebrating discoveries of comets and eclipses that astonished the Royal Society of London.',
        lt: 'Universiteto ansamblis sujungia keturių šimtmečių architektūros stilius. Trylika tarpusavyje sujungtų kiemelių atveria gotikos skliautus, renesanso arkadas ir baroko freskas. 1753 m. Martyno Počobuto įkurtoje observatorijoje ant baltų sienų švyti zodiako ženklai, liudijantys čia vykdytus astronominius atradimus, stebinusius visą Europą.',
      },
      {
        en: 'In the 1820s, the university became the intellectual cradle of romantic nationalism and revolutionary ideals. Secret societies like the Philomaths and Filarets gathered in dim attic rooms, whispering forbidden poetry and dreaming of democratic renewal. Among their brightest minds was Adam Mickiewicz, whose fiery verses ignited generations of freedom fighters. Fearing rebellion, Tsarist Russian authorities brutally closed the university in 1832, sealing the grand library and exiling brilliant professors across the empire for almost a century.',
        lt: 'XIX a. pradžioje universitetas tapo laisvės ir romantizmo idėjų lopšiu. Slaptos studentų filomatų ir filaretų draugijos svajojo apie tautų laisvę. Čia kūrė poetas Adomas Mickevičius. Išsigandusi maišto, caro valdžia 1832 m. universitetą uždarė, o jo bibliotekas ir profesorius išsklaidė beveik šimtmečiui.',
      },
      {
        en: "Reopened in the 20th century, Vilnius University rose again as Lithuania's intellectual engine, producing Nobel laureate Czesław Miłosz, pioneer semiotician Algirdas Julius Greimas, and world-leading quantum laser physicists. Rising 68 meters above the Grand Courtyard, the baroque bell tower of St. Johns' Church offers an incomparable panoramic vista over the red tile roofs of Old Town—a monument to human curiosity that no empire could extinguish.",
        lt: 'Atkurtas po Pirmojo pasaulinio karo, universitetas išugdė Nobelio premijos laureatą Česlovą Milošą, semiotikos tėvą Algirdą Julių Greimą ir pasaulinio lygio lazerių fizikus. Didžiajame kieme stūksanti 68 metrų Šv. Jonų bažnyčios varpinė primena, kad mokslo ir laisvės šviesa nugali bet kokią tamsą.',
      },
    ],
    secretLore: [
      {
        en: "Exclusive Archival Secret: In the Gothic Hall of the university library, preserved under climate-controlled vault locks, rests Martynas Mažvydas' 'Catechism' from 1547—the sole surviving copy in Lithuania of the first printed Lithuanian book.",
        lt: 'Išskirtinis archyvinis faktas: Universiteto bibliotekos saugyklose saugomas vienintelis Lietuvoje išlikęs Martyno Mažvydo 1547 m. „Katekizmo“ egzempliorius – pirmoji spausdinta lietuviška knyga.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Wisdom in Stone: 450 Years of Scholastic Mastery',
        lt: 'Išmintis akmenyje: 450 metų mokslo istorija',
      },
      narrator: {
        en: 'Prof. Alfredas Bumblauskas (Historian)',
        lt: 'Prof. Alfredas Bumblauskas (Istorikas)',
      },
      musicTrack: {
        en: 'Renaissance Harpsichord & Scholastic Strings',
        lt: 'Renesanso klavesinas ir akademinės stygos',
      },
      duration: '6:30',
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
        en: "Separated from Vilnius Old Town by the tumbling currents of the Vilnelė River, Užupis—meaning literally 'the other side of the river'—was historically a working-class quarter of grain mills, leather tanneries, and artisans. During the Soviet period, its beautiful pastel 19th-century tenements fell into severe abandonment and decay. By the early 1990s, with shattered windows and overgrown courtyards, it was considered the roughest, most dangerous quarter of Vilnius.",
        lt: 'Atskirta nuo Vilniaus senamiesčio sraunios Vilnelės upės, Užupio gyvenvietė šimtmečius buvo malūnininkų, amatininkų ir odininkų rajonas. Sovietmečiu šis rajonas buvo apleistas, daugelis pastatų virto griuvėsiais, o dešimtajame dešimtmetyje Užupis buvo laikomas viena pavojingiausių miesto vietų.',
      },
      {
        en: 'Attracted by rock-bottom rents, crumbling baroque spaces, and romantic river bends, penniless painters, sculptors, poets, and musicians began squatting in the abandoned houses. On April Fool’s Day, April 1st, 1997, poet and filmmaker Romas Lileikis and his artistic comrades staged an audacious cultural revolution: they declared Užupis an independent sovereign republic! They established their own constitution, created four national flags (one for each season), appointed a twelve-person navy consisting of wooden rowboats, and declared an army whose official duty is to never fight.',
        lt: 'Pigūs apleisti butai ir upės vingiai priviliojo skurstančius menininkus, tapytojus ir poetus. 1997 m. balandžio 1-ąją, Melagių dieną, Romas Lileikis su bendražygiais paskelbė Užupio Respubliką! Jie sukūrė savo konstituciją, vėliavas visiems keturiems metų laikams, įsteigė 12 narių kariuomenę ir keturių medinių valčių laivyną.',
      },
      {
        en: "Mounted along the stone walls of Paupio Street, etched on polished mirror plaques in over fifty world languages, shines the world-famous Užupis Constitution. Containing 41 philosophical, tender, and humorous articles, it proclaims: 'Everyone has the right to die, but this is not an obligation', 'Everyone has the right to love and take care of a cat', 'A cat is not obliged to love its owner, but must help in time of need', and 'Do not conquer; Do not defend; Do not surrender'. It is celebrated globally as a manifesto of pure human empathy.",
        lt: 'Paupio gatvės sienoje veidrodinėse lentose daugiau nei 50 kalbų švyti garsi Užupio konstitucija. Jos 41 punktas skelbia: „Žmogus turi teisę mirti, bet tai nėra jo pareiga“, „Šuo turi teisę būti šunimi“, „Katė neprivalo mylėti savo šeimininko, bet sunkią akimirką privalo padėti“ ir „Nenugalėk, nesigink, nepasiduok“. Tai manifestas apie žmogiškumą ir laisvę.',
      },
      {
        en: 'On April 1st, 2002, in the central square, the Republic unveiled its crowning jewel: a majestic bronze Angel standing atop an 8.5-meter column, blowing a golden horn to herald the rebirth of spirit and creative courage. Today, the Republic of Užupis welcomes visitors with stampable visas at local cafes, counts the Dalai Lama among its honorary citizens, and stands as living proof that art, humor, and freedom can transform a broken neighborhood into a global sanctuary of hope.',
        lt: '2002 m. balandžio 1-ąją aikštėje iškilo trimituojantis Užupio angelas, tapęs atgimimo ir kūrybos simboliu. Šiandien Užupis turi garbės piliečiu tapusį Dalai Lamą, vilioja keliautojus iš viso pasaulio ir įrodo, kad menas ir laisva mintis gali paversti apleistą kampelį pasauliniu stebuklu.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Under the main bridge connecting Vilnius to Užupis, seated in a stone riverbed niche, sits the bronze Mermaid of Užupis. Legend warns that travelers who look directly into her eyes will fall in love with Užupis and never be able to leave.',
        lt: 'Išskirtinis archyvinis faktas: Po Užupio tiltu akmeninėje nišoje sėdi bronzinė Užupio Undinėlė. Sakoma, kad tas, kas pažvelgs jai tiesiai į akis, amžiams pamils Užupį ir niekada nebenorės išvykti.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Right to Be a Dog: The Complete Spirit of Užupis Bohemian Revolution',
        lt: 'Teisė būti šunimi: Visa Užupio dvasia ir bohema',
      },
      narrator: {
        en: 'Romas Lileikis (President of Užupis Republic)',
        lt: 'Romas Lileikis (Užupio Respublikos Prezidentas)',
      },
      musicTrack: {
        en: 'Acoustic Guitar & Vilnelė River Water Rhythms',
        lt: 'Akustinė gitara ir Vilnelės srovės šnaresys',
      },
      duration: '5:50',
    },
    animation: 'confetti',
    colorHex: '#1d5c38',
    latitude: 54.6802,
    longitude: 25.2948,
  },
  {
    id: 'vln-st-anne-church',
    cityID: 'vln',
    nfcSecretKey: 'ONA-1495',
    title: {
      en: "St. Anne's Church",
      lt: 'Šv. Onos bažnyčia',
    },
    teaser: {
      en: 'Flamboyant Gothic jewel crafted from 33 distinct shapes of clay brick.',
      lt: 'Liepsnojančios gotikos šedevras, sumūrytas iš 33 rūšių plytų.',
    },
    imageUrl: require('../../assets/images/st_anne_church.jpg'),
    durationMinutes: 35,
    activities: [
      {
        en: 'Admire the 33 intricate profiles of shaped red clay bricks forming the western facade.',
        lt: 'Apžiūrėkite 33 skirtingų formų profiliuotas plytas, sudarančias vakarinį fasadą.',
      },
      {
        en: 'Discover the enduring legend of Napoleon wishing to take the church to Paris in his palm.',
        lt: 'Išgirskite legendą apie Napoleoną, norėjusį bažnyčią ant delno nusinešti į Paryžių.',
      },
      {
        en: 'Step inside to explore the adjoining Bernardine monastery complex and Gothic cloisters.',
        lt: 'Užeikite į vidų ir aplankykite greta esantį Bernardinų vienuolyno ansamblį.',
      },
    ],
    story: [
      {
        en: "Rising gracefully beside the rush of the Vilnia River, St. Anne's Church is Europe's undisputed masterpiece of Flamboyant Gothic architecture. Built between 1495 and 1500, possibly commissioned by Grand Duke Alexander for his devout wife Queen Helena, the facade was raised using thirty-three distinct patterns of clay brick. Rather than heavy stone, medieval master builders used local clay, baking slender red ribs that curve upward like living tongues of sacred fire reaching toward the heavens.",
        lt: 'Šv. Onos bažnyčia, iškilusi prie Vilnelės upės vingio, yra unikalus liepsnojančios gotikos šedevras visoje Europoje. Pastatyta apie 1495–1500 metus LDK didžiojo kunigaikščio Aleksandro iniciatyva, ši šventovė sumūryta iš net 33 skirtingų formų raudonų molio plytų. Fasado linijos veržiasi į viršų tarsi gyvos ugnies liepsnos, sukurdamos nepakartojamą lengvumo ir grakštumo įspūdį.',
      },
      {
        en: "Legend attributes its daring design to Bohemian court architect Benedikt Rejt or master mason Michael Enkinger. During the French invasion of Russia in the summer of 1812, Emperor Napoleon Bonaparte stopped in his tracks upon entering the square, captivated by the church's ethereal beauty. French lore recounts that the Emperor declared in awe that if he could, he would cradle the church in the palm of his hand and transport it back to Paris to stand beside Notre-Dame.",
        lt: 'Pasakojama, kad bažnyčią projektavo garsus to meto architektas Benediktas Rejtas arba meistras Mykolas Enkingeris. 1812 m. žygio metu pamatęs šią šventovę, Prancūzijos imperatorius Napoleonas Bonapartas buvo taip pakerėtas jos grožio, kad ištarė garsiuosius žodžius: jei tik galėtų, jis pasidėtų Šv. Onos bažnyčią ant delno ir nuneštų į Paryžių.',
      },
      {
        en: "While the exterior remained astonishingly untouched through centuries of wars and devastating city blazes, the interior experienced dramatic restorations. Connected by an overhead brick archway to the monumental Church of St. Francis and St. Bernard, the two sanctuaries formed a joint defensive and spiritual bastion on the eastern approaches of Vilnius. The adjoining neo-Gothic bell tower, designed by architect Nikolai Chagin in 1872, rings in sweet harmony with the medieval brick choir.",
        lt: 'Nors Vilnių ne kartą niokojo karai ir gaisrai, Šv. Onos bažnyčios fasadas per daugiau nei penkis šimtmečius išliko beveik nepakitęs. Kartu su Bernardinų bažnyčia ir vienuolynu ji sudarė vientisą gynybinį ir dvasinį kompleksą rytinėje miesto dalyje. Greta stovinti XIX a. neogotikinė varpinė puikiai papildo šį unikalų architektūros ansamblį.',
      },
      {
        en: "During the Soviet era, when dozens of Vilnius churches were expropriated and desecrated into sports halls or warehouses, St. Anne's remained open for holy mass due to its globally acclaimed architectural status. Today, St. Anne's stands as an immortal symbol of Vilnius—a delicate symphony of red brick that has greeted poets, dreamers, and pilgrims across more than half a millennium.",
        lt: 'Sovietmečiu, kai daugelis Vilniaus bažnyčių buvo uždarytos ar paverstos sandėliais, Šv. Onos bažnyčia dėl savo išskirtinės meninės vertės liko veikianti. Šiandien ji išlieka vienu mylimiausių Vilniaus simbolių – trapi, liepsnojanti raudonų plytų poema, žavinti viso pasaulio keliautojus.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In 2009, restoration specialists uncovered tiny medieval mason marks and astrological compass etchings on the bricks of the south turret, proving the clay was fired in specialized kilns along the Vilnia riverbanks using local river silt mixed with rye flour and egg whites.',
        lt: 'Išskirtinis archyvinis faktas: 2009 m. restauratoriai pietiniame bokštelyje aptiko viduramžių mūrininkų ženklus ir astrologinius kompaso įrėžimus. Tyrimai atskleidė, kad plytų moliui rišti buvo naudojamas specialus Vilnelės dumblas su rugių miltų ir kiaušinių baltymų priedais.',
      },
    ],
    audioGuide: {
      title: {
        en: "Fires of Gothic Grace: The Brick Symphony of St. Anne's",
        lt: 'Gotikos liepsnos: Šv. Onos plytų simfonija',
      },
      narrator: {
        en: 'Marija Drėmaitė (Architectural Historian)',
        lt: 'Marija Drėmaitė (Architektūros istorikė)',
      },
      musicTrack: {
        en: 'Gothic Polyphony & Warm Cello Strings',
        lt: 'Gotikinė polifonija ir violončelės stygos',
      },
      duration: '5:30',
    },
    animation: 'pulse',
    colorHex: '#1d5c38',
    latitude: 54.6831,
    longitude: 25.2927,
  },
  {
    id: 'vln-three-crosses',
    cityID: 'vln',
    nfcSecretKey: 'KRYZIAI-1989',
    title: {
      en: 'Hill of Three Crosses',
      lt: 'Trijų Kryžių kalnas',
    },
    teaser: {
      en: 'Panoramic monument on the Bleak Hill honoring Franciscan martyrs and Lithuanian rebirth.',
      lt: 'Paminklas ant Plikojo kalno, menantis pranciškonų kankinius ir tautos atgimimą.',
    },
    imageUrl: require('../../assets/images/three_crosses.jpg'),
    durationMinutes: 40,
    activities: [
      {
        en: 'Hike the scenic wooden woodland staircases climbing through Kalnų Park to the crest.',
        lt: 'Užlipkite mediniais laiptais per vaizdingą Kalnų parko mišką iki kalno viršūnės.',
      },
      {
        en: 'Stand beneath the 12-meter reinforced concrete monument for an unrivaled panorama of Old Town.',
        lt: 'Atsistokite po 12 metrų paminklu ir pasigrožėkite kvapą gniaužiančia senamiesčio panorama.',
      },
      {
        en: 'Inspect the cracked foundation ruins of the original 1916 crosses dynamited by Soviet authorities.',
        lt: 'Apžiūrėkite sovietų susprogdinto pirminio 1916 m. paminklo liekanas kalno papėdėje.',
      },
    ],
    story: [
      {
        en: "Soaring high above the roofs of Vilnius on the crest of the Bleak Hill (Plikasis kalnas), three towering white crosses gleam against the northern sky. According to ancient Lithuanian chronicles from the 16th century, fourteen Franciscan friars were invited to Vilnius by Grand Duke Algirdas' voivode Petras Goštautas around 1340. While the rulers were away on campaign, hostile pagan residents martyred the friars—crucifying seven and casting them into the rushing Vilnia River, while the other seven were crucified atop this wooden hill crest.",
        lt: 'Aukštai virš Vilniaus stogų ant Plikojo kalno viršūnės švyti trys balti kryžiai. Pasak Bychovco kronikos, apie 1340 m. LDK kancleris Petras Goštautas pasikvietė į Vilnių keturiolika pranciškonų vienuolių. Valdovams išvykus į karo žygį, pagonys miestiečiai vienuolius nužudė: septynis nukryžiavo ir nuleido Vilnele, o kitus septynis nukryžiavo ant šio kalno.',
      },
      {
        en: "Wooden crosses were first raised on the hill in the early 17th century to commemorate the martyrs and ward off plague. For over three centuries, whenever the wooden timber rotted, local citizens gathered to replace them. In 1916, amidst the turbulence of World War I, visionary Polish-Lithuanian sculptor and architect Antoni Wiwulski designed a bold reinforced concrete monument featuring three monumental crosses anchored to a solid stone plinth, visible from across the entire city basin.",
        lt: 'Pirmieji mediniai kryžiai ant kalno iškilo dar XVII amžiaus pradžioje kaip atminimo ir apsaugos nuo maro ženklas. Per šimtmečius supuvusius medinius kryžius vilniečiai atstatydavo vėl ir vėl. 1916 m., vykstant Pirmajam pasauliniam karui, žymus skulptorius Antanas Vivulskis sukūrė monumentalų gelžbetoninį trijų kryžių paminklą, tapusį neatsiejama miesto panoramos dalimi.',
      },
      {
        en: "On the dark night of May 30th, 1950, Soviet military demolition squads under secret orders from the Communist authorities ascended the hill with heavy dynamite. In a deafening explosion that shook the city below, the monumental crosses were blown apart, and the broken concrete fragments were buried deep in the hill slopes to erase the memory of the sacred sanctuary. For nearly four decades, the hill stood bare, yet citizens secretly laid wildflowers on the bulldozed summit.",
        lt: '1950 m. gegužės 30-osios naktį sovietų valdžios įsakymu paminklas buvo slapta susprogdintas galingais sprogmenimis. Betono luitai buvo užkasti į kalno šlaitus, siekiant visiškai ištrinti šventos vietos atminimą iš žmonių atminties. Tačiau beveik keturis dešimtmečius vilniečiai slapta nešė gėles ant pliko kalno viršūnės.',
      },
      {
        en: "In the euphoria of the 1989 Singing Revolution, renowned architect Henrikas Šilgalis led a nationwide campaign to rebuild the monument according to Wiwulski's original drawings. Exactly 39 years after their destruction, on June 14th, 1989—the National Day of Mourning and Hope—the resurrected Three Crosses were solemnly consecrated before tens of thousands of citizens holding yellow, green, and red flags. Today, illuminated brilliantly at night, they shine as an eternal beacon of sacrifice and spiritual victory.",
        lt: '1989 m., kylant Sąjūdžio bangai, architektas Henrikas Šilgalis atkūrė paminklą pagal Vivulskio projektą. 1989 m. birželio 14 d., Gedulo ir vilties dieną, tūkstančių žmonių akyse Trijų Kryžių paminklas buvo iškilmingai pašventintas. Šiandien naktimis apšviesti kryžiai saugo Vilnių kaip nepalaužiamos laisvės ir pasiaukojimo švyturys.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: During the 1989 reconstruction, workers uncovered the original cracked concrete fragments of Wiwulski’s 1916 crosses buried under five meters of soil. Rather than discarding them, architects incorporated the original blasted fragments into the stone terrace base as an eternal scar of history.',
        lt: 'Išskirtinis archyvinis faktas: 1989 m. atliekant žemės darbus, po penkių metrų žemės sluoksniu buvo rasti susprogdinto 1916 m. Vivulskio paminklo luitai. Architektai nusprendė juos atidengti ir integruoti į paminklo papėdę kaip amžiną istorijos randą.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Beacon on the Crest: Chronicle of the Three Crosses',
        lt: 'Švyturys ant kalno: Trijų Kryžių kronika',
      },
      narrator: {
        en: 'Henrikas Šilgalis (Architect & Restorer)',
        lt: 'Henrikas Šilgalis (Architektas restauratorius)',
      },
      musicTrack: {
        en: 'Solemn Horns & Choral Cadence of Hope',
        lt: 'Iškilmingos daudytės ir vilties choralas',
      },
      duration: '5:40',
    },
    animation: 'bloom',
    colorHex: '#1d5c38',
    latitude: 54.6868,
    longitude: 25.2974,
  },
  {
    id: 'vln-grand-dukes-palace',
    cityID: 'vln',
    nfcSecretKey: 'VALDOVAI-1544',
    title: {
      en: 'Palace of the Grand Dukes of Lithuania',
      lt: 'Valdovų rūmai',
    },
    teaser: {
      en: 'Renaissance and Baroque seat of Lithuanian sovereigns and European diplomacy.',
      lt: 'Renesanso ir baroko Lietuvos valdovų bei diplomatijos rezidencija.',
    },
    imageUrl: require('../../assets/images/grand_dukes_palace.jpg'),
    durationMinutes: 70,
    activities: [
      {
        en: 'Walk across suspended glass walkways hovering over 14th–16th century brick archaeological ruins.',
        lt: 'Pereikite stikliniais tiltais virš XIV–XVI a. mūrų ir archeologinių kasinėjimų.',
      },
      {
        en: 'Marvel at the reconstructed Great Throne Hall with its gold-leaf ceiling and Flemish tapestries.',
        lt: 'Pasigrožėkite atkurta Didžiąja renesanso sosto sale su auksuotomis lubomis ir gobelenais.',
      },
      {
        en: 'Inspect royal Renaissance tiled stoves emblazoned with the Lithuanian Vytis and Polish Eagle.',
        lt: 'Apžiūrėkite renesansines koklių krosnis su Vyčio ir Jogailaičių herbais.',
      },
    ],
    story: [
      {
        en: "Situated in the lower castle valley at the foot of Gediminas Hill, the Palace of the Grand Dukes was the political, diplomatic, and cultural nerve center of the Grand Duchy of Lithuania for over four centuries. Originating as a wooden defensive redoubt in the 13th and 14th centuries, it was transformed by Vytautas the Great into a formidable Gothic brick residence where rulers held court, received envoys from Constantinople, and guarded the state treasury.",
        lt: 'Vilniaus Žemutinėje pilyje įsikūrę Valdovų rūmai daugiau nei keturis šimtmečius buvo Lietuvos Didžiosios Kunigaikštystės politinis, diplomatinis ir kultūrinis centras. XIV a. čia stovėjo Vytauto Didžiojo gotikinė rezidencija, kurioje valdovai priiminėjo pasiuntinius iš visos Europos ir saugojo valstybės iždą bei archyvus.',
      },
      {
        en: "In the 16th century, Grand Duke Sigismund I the Old and his Italian wife, Queen Bona Sforza of Milan, brought the luminous Italian Renaissance to Vilnius. Italian architects Bartolomeo Berrecci and Giovanni Cini transformed the Gothic residence into a lavish palace with open arcaded loggias, majolica floor tiles, and lush Italian gardens. Here, their son Sigismund Augustus assembled one of Europe's largest book collections and fell deeply in love with the captivating Lithuanian noblewoman Barbara Radziwiłł.",
        lt: 'XVI a. pradžioje Žygimantas Senasis ir jo žmona, Milano princesė Bona Sforca, atvežė į Vilnių itališkojo Renesanso dvasią. Italų meistrai perstatė rūmus į prabangią rezidenciją su arkadomis, marmuro židiniais ir privačiais sodais. Čia valdovas Žygimantas Augustas sukūrė garsiąją biblioteką ir išgyveno aistringą meilę su Barbora Radvilaite.',
      },
      {
        en: "Under the Vasa dynasty in the early 17th century, the palace was transformed into a dramatic Early Baroque residence, staging Lithuania's very first Italian opera performance, 'The Abduction of Elena', in 1636—years before operas were performed in Paris or London! Tragedy struck in 1655 during the Muscovite invasion: the palace was sacked, stripped of its treasures, and left in ruins. In 1801, Tsarist authorities ordered the remaining walls demolished, burying the palace beneath leveling soil.",
        lt: 'XVII a. Vazos dvaro laikais rūmai tapo barokine rezidencija, kurioje 1636 m. buvo pastatyta pirmoji opera Lietuvoje „Elenos pagrobimas“ – anksčiau nei Paryžiuje ar Londone! 1655 m. Maskvos okupacijos metu rūmai buvo nusiaubti ir apiplėšti, o 1801 m. carinė valdžia galutinai nugriovė likusius mūrus.',
      },
      {
        en: "Following Lithuania's restored independence in 1990, archaeologists conducted the largest excavation in Baltic history, uncovering over 300,000 artifacts from pottery and chainmail to gilded leather shoes and royal chess pieces. Between 2002 and 2018, the palace was meticulously resurrected above the preserved original foundations. Today, the Palace of the Grand Dukes stands once again as a monument to Lithuania's golden age of European statehood.",
        lt: 'Atkūrus nepriklausomybę, archeologai atliko didžiausius Baltijos šalyse kasinėjimus ir rado per 300 000 unikalių eksponatų. 2002–2018 m. rūmai buvo kruopščiai atstatyti virš išsaugotų autentiškų pamatų. Šiandien Valdovų rūmai vėl liudija Lietuvos valstybingumo ir Europos kultūros didybę.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: During archaeological digs in the cellars, researchers discovered a hidden drainage canal containing 16th-century gold signet rings, a rare Venetian glass goblet, and the personal ivory seal of Queen Bona Sforza, lost during a royal banquet over 450 years ago.',
        lt: 'Išskirtinis archyvinis faktas: Kasinėjant rūmų rūsius buvo atrastas slaptas kanalas, kuriame archeologai rado XVI a. auksinių žiedų su brangakmeniais, Venecijos stiklo taurę bei asmeninį karalienės Bonos Sforcos dramblio kaulo antspaudą.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Echoes of the Throne: Renaissance Splendor at the Lower Castle',
        lt: 'Sosto aidas: Renesanso didybė Žemutinėje pilyje',
      },
      narrator: {
        en: 'Dr. Vydas Dolinskas (Museum Director)',
        lt: 'Dr. Vydas Dolinskas (Muziejaus direktorius)',
      },
      musicTrack: {
        en: 'Royal Fanfares & Baroque Lute Courante',
        lt: 'Karališkos fanfaros ir barokinė liutnia',
      },
      duration: '6:15',
    },
    animation: 'orbit',
    colorHex: '#1d5c38',
    latitude: 54.6860,
    longitude: 25.2891,
  },
  {
    id: 'vln-peter-paul-church',
    cityID: 'vln',
    nfcSecretKey: 'PACAS-1668',
    title: {
      en: 'Church of St. Peter and St. Paul',
      lt: 'Šv. Petro ir Povilo bažnyčia',
    },
    teaser: {
      en: 'Baroque masterpiece adorned with over 2,000 pure white stucco figures.',
      lt: 'Baroko perlas su daugiau nei 2 000 baltų gipso skulptūrų ir reljefų.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1548625361-19597793574c?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 45,
    activities: [
      {
        en: 'Look up into the central nave to see the floating crystal boat chandelier depicting St. Peter.',
        lt: 'Pažvelkite į viršų ir pamatykite krištolinį laivo formos šviestuvą, menantį šv. Petrą.',
      },
      {
        en: 'Count the expressive white stucco statues of angels, Roman soldiers, and mythical beasts.',
        lt: 'Pasigrožėkite tūkstančiais angelų, karių ir mistinių būtybių skulptūrų ant sienų.',
      },
      {
        en: "Find the humble tombstone of Grand Hetman Pac beneath the threshold inscribed 'Here lies a sinner'.",
        lt: 'Raskite fundatoriaus Mykolo Kazimiero Paco kapo plokštę su užrašu „Čia ilsisi nusidėjėlis“.',
      },
    ],
    story: [
      {
        en: "Located in the leafy Antakalnis district of Vilnius, the Church of St. Peter and St. Paul is hailed by art historians worldwide as one of the most sublime Late Baroque sanctuaries on Earth. Founded in 1668 by Grand Hetman of Lithuania Michał Kazimierz Pac, the church was built as a solemn vow of thanksgiving after the catastrophic Muscovite war of 1655–1661 had ended and Vilnius was finally liberated.",
        lt: 'Vilniaus Antakalnyje stovinti Šv. apaštalų Petro ir Povilo bažnyčia pasaulio menotyrininkų pripažįstama vienu gražiausių brandžiojo baroko perlų pasaulyje. Ją 1668 m. fundavo LDK didysis etmonas Mykolas Kazimieras Pacas kaip padėką Dievui už Vilniaus išlaisvinimą po septynerius metus trukusios Maskvos okupacijos.',
      },
      {
        en: "While the neoclassical exterior facade presents a dignified and restrained entrance, stepping through the portal takes one's breath away. Over two thousand unique, lifelike white stucco figures cascade across every dome, archway, and cornice. Created between 1677 and 1682 by master Italian sculptors Giovanni Pietro Perti and Giovanni Maria Galli, the interior is an unbroken sea of celestial alabaster—not a single square meter of wall is left unadorned.",
        lt: 'Nors išorė atrodo santūri, įžengus pro duris apima nuostaba: visas bažnyčios vidus padengtas daugiau nei dviem tūkstančiais sniego baltumo gipso skulptūrų ir reljefų. Šį stebuklą 1677–1682 m. sukūrė italų meistrai Džiovanis Pjetras Pertis ir Džiovanis Marija Galis. Čia nėra nė vieno nepapuošto kampelio.',
      },
      {
        en: "Suspended in the center of the nave floats an extraordinary chandelier shaped like a crystal sailing ship, installed in 1905 to commemorate the fisherman apostle St. Peter. Among the thousands of figures, look for the chilling life-sized sculpture of Death clutching an hourglass and scythe, reminding mortals that worldly power and riches are fleeting whispers against eternity.",
        lt: 'Bažnyčios centre kabo unikalus krištolinis laivas – 1905 m. meistrų sukurtas šviestuvas, simbolizuojantis apaštalo Petro žvejo laivelį. Tarp galybės angelų ir šventųjų galima rasti ir giltinės skulptūrą su dalgiu ir smėlio laikrodžiu, primenančią žmogui gyvenimo trapumą.',
      },
      {
        en: "Grand Hetman Pac was so deeply humbled by his faith that he refused an elaborate marble mausoleum. Instead, he requested to be buried directly beneath the church threshold, so that every pilgrim entering the sanctuary would walk over his resting place. His gravestone remains visible today, etched with the Latin inscription: 'Hic iacet peccator' ('Here lies a sinner').",
        lt: 'Didysis etmonas Pacas atsisakė didingo mauziejaus ir paprašė palaidoti jį po pačiu bažnyčios slenksčiu, kad kiekvienas įeinantis maldininkas tryptų jo kapą. Ant antkapio plokštės iki šiol galima perskaityti lotyniškus žodžius: „Hic iacet peccator“ („Čia ilsisi nusidėjėlis“).',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In 1944, during the fierce artillery battles for the liberation of Vilnius, German and Soviet shells struck buildings just meters away, yet St. Peter and St. Paul suffered zero artillery damage, leading locals to believe the 2,000 angels formed an invisible shield over the vault.',
        lt: 'Išskirtinis archyvinis faktas: 1944 m. Antakalnio mūšių metu aplinkui sproginėjo šimtai artilerijos sviedinių, tačiau bažnyčia stebuklingai nenukentėjo – nesudužo net trapiausi krištolinio laivo elementai.',
      },
    ],
    audioGuide: {
      title: {
        en: 'The Alabaster Heavens: 2,000 Angels of Antakalnis',
        lt: 'Gipso dangus: 2000 Antakalnio angelų',
      },
      narrator: {
        en: 'Monsignor Jan Kasiukevič',
        lt: 'Monsinjoras Jan Kasiukevič',
      },
      musicTrack: {
        en: 'Baroque Organ Concerto & Ethereal Chimes',
        lt: 'Barokiniai vargonai ir krištolo varpeliai',
      },
      duration: '5:45',
    },
    animation: 'wave',
    colorHex: '#1d5c38',
    latitude: 54.6940,
    longitude: 25.3056,
  },
  {
    id: 'vln-bastion',
    cityID: 'vln',
    nfcSecretKey: 'BASTEJA-1628',
    title: {
      en: 'Bastion of the Defensive Wall',
      lt: 'Vilniaus gynybinės sienos bastėja',
    },
    teaser: {
      en: '17th-century artillery fortification and legendary lair of the Vilnius Basilisk.',
      lt: 'XVII a. artilerijos gynybinis fortas ir legendinio Vilniaus Bazilisko buveinė.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 40,
    activities: [
      {
        en: 'Explore the subterranean brick cannon casemates and gunpowder storage galleries.',
        lt: 'Nusileiskite į požeminius mūrinius patrankų kazamatus ir parako saugyklas.',
      },
      {
        en: 'Walk onto the elevated observation terrace for a panoramic view over Vilnius Old Town rooftops.',
        lt: 'Užlipkite ant apžvalgos terasos pasigrožėti nuostabia senamiesčio čerpių panorama.',
      },
      {
        en: 'Discover the chilling folklore of the Basilisk, the monster whose gaze turned men to stone.',
        lt: 'Išgirskite legendą apie paslaptingąjį Vilniaus Baziliską, žvilgsniu stingdžiusį žmones.',
      },
    ],
    story: [
      {
        en: "Perched dramatically upon Bokšto Hill overlooking the southern approaches to the city, the Bastion of the Vilnius City Wall is a marvel of Renaissance military engineering. Commissioned in the 1620s by King Sigismund III Vasa and designed by German royal military engineer Friedrich Getkant, this horseshoe-shaped redoubt was built to protect Vilnius against powerful modern siege artillery and Muscovite cavalry charges.",
        lt: 'Ant Bokšto kalno iškilusi Vilniaus gynybinės sienos bastėja (barbakanas) yra XVII a. karybos inžinerijos stebuklas. Ją apie 1620–1628 m. suprojektavo vokiečių karo inžinierius Frydrichas Getkantas LDK valdovo Žygimanto Vazos pavedimu, siekiant apginti miestą nuo sunkiosios apgulties artilerijos.',
      },
      {
        en: "The fortification consists of a massive circular cannon tower, a subterranean tunnel gallery linking to the city wall, and a broad curved artillery casemate fitted with embrasures. Deep beneath the heavy vaulted ceilings, gunners loaded bronze cannons with iron cannonballs and grape-shot, prepared to sweep the Subačius and Medininkai gates with devastating crossfire.",
        lt: 'Bastėją sudaro pusapvalis bokštas, pasagos formos artilerijos kazamatas su šaudymo angomis ir juos jungiantis požeminis tunelis. Po storais plytų skliautais budėję artileristai buvo pasirengę atremti priešus, puolančius pro Subačiaus vartus.',
      },
      {
        en: "Deep within the shadowed vaults lives Vilnius's most famous urban monster: the terrifying Basilisk. Born from an egg laid by a rooster and incubated by a toad, the beast possessed the head of a rooster, wings of a bat, and the tail of a serpent. Its gaze was so lethal that any soldier who peered into its eyes turned instantly to stone. According to legend, a clever young Vilnius apprentice defeated the monster by descending into its lair holding a mirror, forcing the creature to gaze upon its own deadly reflection.",
        lt: 'Su bastėjos požemiais glaudžiai susijusi garsi Vilniaus legenda apie baisųjį Baziliską – pabaisą su gaidžio galva, šikšnosparnio sparnais ir gyvatės uodega, kurio žvilgsnis paversdavo žmogų akmeniu. Pasakojama, kad narsus jaunuolis nugalėjo pabaisą nusileidęs į požemius su veidrodžiu: Baziliskas pažvelgė į savo atspindį ir pražuvo nuo savo paties žvilgsnio.',
      },
      {
        en: "Heavily bombarded in the 17th century and buried under defense earthworks during the 19th century, the bastion was rediscovered by archaeologists and meticulously restored into a world-class armory museum. Today, visitors can descend into the cool brick tunnels and look out from the high terrace at one of the finest skyline views in the Baltic states.",
        lt: 'XIX a. užpilta žemėmis ir beveik užmiršta, bastėja buvo atkasta ir paversta ginkluotės muziejumi. Šiandien iš čia atsiveria viena gražiausių Vilniaus senamiesčio panoramų, o požemiai kviečia pajusti viduramžių gynėjų drąsą.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: During 1980s excavations, archaeologists uncovered an intact cache of stone cannonballs dating from the 1655 siege, alongside clay smoking pipes and iron dice used by Polish-Lithuanian artillerymen during quiet watches.',
        lt: 'Išskirtinis archyvinis faktas: Kasinėjant kazamatus buvo rastas XVII a. artileristų slėptuvė su akmeniniais patrankų sviediniais, molinėmis pypkėmis ir kauliniais lošimo kauliukais, kuriais kariai trumpindavo naktines sargybas.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Thunder in the Casemates: Siege and Lore at the Bastion',
        lt: 'Griausmas kazamatuose: Bastėjos apgultis ir legendos',
      },
      narrator: {
        en: 'Gintautas Surgailis (Military Historian)',
        lt: 'Gintautas Surgailis (Karo istorikas)',
      },
      musicTrack: {
        en: 'March of the Hussars & Distant Cannon Echoes',
        lt: 'Husarų žygio ritmai ir patrankų aidas',
      },
      duration: '5:20',
    },
    animation: 'pulse',
    colorHex: '#1d5c38',
    latitude: 54.6775,
    longitude: 25.2933,
  },
  {
    id: 'vln-bernardine-garden',
    cityID: 'vln',
    nfcSecretKey: 'SEREIKISKES-1469',
    title: {
      en: 'Bernardine Garden',
      lt: 'Bernardinų sodas',
    },
    teaser: {
      en: 'Historic botanical sanctuary nestled in the romantic curve of the Vilnia River.',
      lt: 'Istorinis botanikos sodas prie srauniosios Vilnelės vingių.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 35,
    activities: [
      {
        en: 'Stroll through the medicinal monastic herb garden reconstructed from authentic 15th-century layouts.',
        lt: 'Pasivaikščiokite po vienuolių vaistažolių sodą, atkurtą pagal istorinius vienuolyno brėžinius.',
      },
      {
        en: 'Relax beside the dancing musical fountains choreographing water jets to classical melodies.',
        lt: 'Pailsėkite prie grojančio muzikinio fontano, šokančio pagal klasikines melodijas.',
      },
      {
        en: 'Touch the ancient 300-year-old Bernardine Oak, the oldest surviving tree in Vilnius city center.',
        lt: 'Palieskite senąjį 300 metų Bernardinų ąžuolą – seniausią medį miesto centre.',
      },
    ],
    story: [
      {
        en: "Cradled in the lush natural amphitheater between Gediminas Castle Hill, the Bleak Hill, and the rushing Vilnia River, Bernardine Garden—historically known as Sereikiškės Park—has been a verdant haven for over five hundred years. In 1469, Grand Duke Casimir IV Jagiellon granted this riverfront meadow to the newly arrived Franciscan Bernardine monks, who planted vegetable plots, medicinal herb cloisters, and fruit orchards.",
        lt: 'Tarp Gedimino kalno, Plikojo kalno ir Vilnelės upės vingių įsikūręs Bernardinų sodas (istorinis Sereikiškių parkas) yra žalias Vilniaus prieglobstis jau daugiau nei 500 metų. 1469 m. LDK valdovas Kazimieras Jogailaitis padovanojo šias žemes pranciškonams bernardinams, kurie čia įveisė vaistažolių ir vaismedžių sodus.',
      },
      {
        en: "By the early 19th century, the park transformed into the official Botanical Garden of Vilnius University under the leadership of world-renowned botanist Stanisław Bonifacy Jundziłł. Over seven thousand species of rare and exotic plants from across the continents were gathered here, flourishing beside the river dams, grain mills, and wooden footbridges where university scholars debated philosophy.",
        lt: 'XIX a. pradžioje žymus botanikas Stanislovas Bonifacas Jundzilas pavertė šį parką Vilniaus universiteto botanikos sodu. Čia suvešėjo tūkstančiai retų augalų rūšių, buvo įrengti tvenkiniai ir gėlynai, o palei Vilnelės krantus vaikščiojo universiteto profesoriai ir studentai.',
      },
      {
        en: "In the late 19th century, Belgian-born landscape master Édouard André and artist Józef Strumiłło redesigned the park into an exquisite public pleasure garden, featuring Victorian iron gazebos, promenade avenues lined with linden trees, and open-air classical symphony concerts that enchanted romantic poet Adam Mickiewicz and painter M. K. Čiurlionis.",
        lt: 'XIX a. pabaigoje sodas tapo populiaria vilniečių pasivaikščiojimo vieta. Čia skambėjo orkestrų muzika, buvo įrengtos pavėsinės ir vingiuoti takai, o sodo medžių pavėsyje įkvėpimo sėmėsi poetai ir menininkai.',
      },
      {
        en: "Reopened in 2013 after an award-winning restoration, Bernardine Garden today combines 19th-century elegance with modern tranquility. Featuring dancing musical fountains, a reconstructed monastic garden, botanical rockeries, and the venerable 300-year-old oak tree, it offers travelers an oasis of peace right in the historic heart of Vilnius.",
        lt: '2013 m. sodas buvo kruopščiai atvertas po didžiulės rekonstrukcijos. Šiandien Bernardinų sodas sujungia XIX a. eleganciją su ramybe: muzikiniai fontanai, vienuolių vaistažolių ekspozicija ir senieji ąžuolai dovanoja ramybę kiekvienam Vilniaus svečiui.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Beneath the roots of the ancient Bernardine Oak, archaeologists uncovered the remains of a 14th-century pagan ritual fireplace with oak ash and river amber pebbles, indicating the site was a sacred oak grove long before Christian monastic cloisters arose.',
        lt: 'Išskirtinis archyvinis faktas: Po senojo ąžuolo šaknimis archeologai aptiko XIV a. pagoniškos aukojimo ugniavietės liekanas su ąžuolo pelenais ir gintaro gabalėliais, liudijančias, kad čia būta šventos ąžuolų giraitės dar prieš įsikuriant vienuoliams.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Whispering Waters: Five Centuries in the Monastic Gardens',
        lt: 'Vilnelės šnabždesys: Penki šimtmečiai vienuolių sode',
      },
      narrator: {
        en: 'Dalia Pečiulytė (Botanical Historian)',
        lt: 'Dalia Pečiulytė (Botanikos istorikė)',
      },
      musicTrack: {
        en: 'Acoustic Harp & River Vilnia Water Ripples',
        lt: 'Akustinė arfa ir Vilnelės srovės čiurlenimas',
      },
      duration: '5:10',
    },
    animation: 'wave',
    colorHex: '#1d5c38',
    latitude: 54.6836,
    longitude: 25.2970,
  },
  {
    id: 'kns-kaunas-castle',
    cityID: 'kns',
    nfcSecretKey: 'KAUNAS-1361',
    title: {
      en: 'Kaunas Castle',
      lt: 'Kauno pilis',
    },
    teaser: {
      en: 'Lithuania’s oldest brick fortress guarding the confluence of Nemunas and Neris.',
      lt: 'Seniausia mūrinė Lietuvos pilis ties Nemuno ir Neries santaka.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 45,
    activities: [
      {
        en: 'Step inside the restored round defensive tower to see catapult projectiles and medieval armor.',
        lt: 'Užeikite į apvalųjį gynybos bokštą ir apžiūrėkite katapultų sviedinius bei riterių šarvus.',
      },
      {
        en: 'Walk along the deep dry defensive moat where Duke Vaidotas battled the Crusaders in 1362.',
        lt: 'Pasivaikščiokite giliu gynybinio griovio dugnu, menančiu 1362 m. kunigaikščio Vaidoto kovas.',
      },
      {
        en: 'Stroll into neighboring Santaka Park to view the confluence of Lithuania’s two greatest rivers.',
        lt: 'Nueikite į Santakos parką, kur susilieja dvi didžiausios Lietuvos upės – Nemunas ir Neris.',
      },
    ],
    story: [
      {
        en: "Commanding the strategic confluence where the dark currents of the Neris meet the broad waters of the Nemunas, Kaunas Castle is the oldest surviving stone fortress in Lithuania. Constructed in the mid-14th century from massive fieldstones and red gothic bricks, this fortified bastion served as the supreme frontline shield defending the pagan Grand Duchy against the ruthless Teutonic Crusader Order.",
        lt: 'Kauno pilis, stūksanti ties Nemuno ir Neries santaka, yra seniausia mūrinė pilis Lietuvoje. Pastatyta XIV a. viduryje iš stambių lauko riedulių ir raudonų gotikinių plytų, ši tvirtovė tapo svarbiausiu skydų, saugojusiu pagonišką Lietuvą nuo Vokiečių ordino kryžiuočių antpuolių.',
      },
      {
        en: "In March 1362, the Teutonic Knights launched a colossal siege, surrounding the fortress with catapults, battering rams, and over ten thousand armored warriors. A small garrison of Lithuanian warriors led by Duke Vaidotas, son of Grand Duke Kęstutis, mounted an epic three-week defense. Even when the outer walls were breached and siege towers ignited, the defenders fought to the last man. Their bravery became legendary in Baltic military history.",
        lt: '1362 m. pavasarį kryžiuočiai apgulė pilį su galingomis apgulties mašinomis. Nedidelė lietuvių įgula, vadovaujama Kęstučio sūnaus kunigaikščio Vaidoto, tris savaites didvyriškai priešinosi dešimteriopai didesnėms pajėgoms. Net sugriuvus sienoms kariai kovėsi iki galo, įrašydami šį mūšį į garbingiausius Lietuvos istorijos puslapius.',
      },
      {
        en: "Following the historic victory at Grunwald in 1410, Grand Duke Vytautas the Great rebuilt Kaunas Castle into an imposing residence with four rounded corner watchtowers and deep moats. It housed state courts, a royal customs post collecting tolls from Hanseatic merchant ships, and even a prison where captured Teutonic knights were held.",
        lt: 'Po Žalgirio mūšio pergalės 1410 m. Vytautas Didysis atstatė Kauno pilį su keturiais apvaliais gynybiniais bokštais ir giliais grioviais. Čia veikė muitinė, teismas ir rezidencija, prižiūrėjusi prekybą Nemunu su Hanzos sąjungos pirkliais.',
      },
      {
        en: "Local Kaunas legends whisper that beneath the castle moat lies an enchanted subterranean cavern where the slumbering knights of Duke Vaidotas wait in full battle armor on warhorses, ready to awaken and defend Lithuania whenever their homeland faces mortal peril. Today, the restored red-brick tower hosts the Kaunas City Museum and welcomes travelers to the historic heart of the city.",
        lt: 'Legenda byloja, kad po pilies rūsiais giliai po žeme miega užburti kunigaikščio Vaidoto riteriai ant eiklių žirgų, pasirengę pabusti ir apginti Lietuvą, kai tik jai iškils pavojus. Šiandien atstatytas bokštas pasitinka keliautojus įdomiomis ekspozicijomis ir renginiais.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Geological surveys of the castle basement revealed a collapsed tunnel extending toward the old Town Hall Square, used by medieval defenders as a secret water supply escape corridor during the 1362 siege.',
        lt: 'Išskirtinis archyvinis faktas: Pilies rūsio tyrimai atskleidė užgriuvusį požeminį tunelį link Rotušės aikštės, kuriuo pilies gynėjai apgulties metu slapta apsirūpindavo vandeniu ir palaikė ryšį su miestu.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Siege at the Confluence: Duke Vaidotas and Kaunas Fortress',
        lt: 'Apgultis ties santaka: Kunigaikštis Vaidotas ir Kauno pilis',
      },
      narrator: {
        en: 'Prof. Valdas Rakutis (Military Historian)',
        lt: 'Prof. Valdas Rakutis (Karo istorikas)',
      },
      musicTrack: {
        en: 'Medieval War Drums & Confluence River Ambient',
        lt: 'Viduramžių karo būgnai ir upių santakos bangavimas',
      },
      duration: '6:00',
    },
    animation: 'orbit',
    colorHex: '#b43a2b',
    latitude: 54.8989,
    longitude: 23.8887,
  },
  {
    id: 'kns-pazaislis-monastery',
    cityID: 'kns',
    nfcSecretKey: 'PAZAISLIS-1664',
    title: {
      en: 'Pažaislis Monastery',
      lt: 'Pažaislio vienuolynas',
    },
    teaser: {
      en: 'Italian High Baroque jewel and spiritual sanctuary on the Kaunas Lagoon shore.',
      lt: 'Itališkojo brandžiojo baroko šedevras ant Kauno marių kranto.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1548625361-19597793574c?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 60,
    activities: [
      {
        en: 'Gaze up into the breathtaking 50-meter hexagonal dome adorned with Michelangelo Palloni frescoes.',
        lt: 'Pakelkite akis į 50 metrų šešiakampį kupolą su Mikelandželo Palonio freskomis.',
      },
      {
        en: 'Wander through the peaceful Camaldolese hermit cloister gardens lined with century-old linden trees.',
        lt: 'Pasivaikščiokite po kamaldulių vienuolių sodus ir šimtametes liepų alėjas.',
      },
      {
        en: 'Admire the miraculous icon of the Mother of Beautiful Love brought from Rome in 1661.',
        lt: 'Pagarbinkite stebuklingąjį Gražiosios Meilės Motinos paveikslą, atvežtą iš Romos.',
      },
    ],
    story: [
      {
        en: "Rising serenely upon a wooded peninsula embraced by the sparkling waters of the Kaunas Lagoon, Pažaislis Monastery is acknowledged as one of the purest and most magnificent masterpieces of High Baroque architecture in all of North-Eastern Europe. Founded in 1664 by Krzysztof Zygmunt Pac, Grand Chancellor of Lithuania, this sanctuary was conceived as a secluded spiritual haven for the hermit monks of the strict Camaldolese Order.",
        lt: 'Pažaislio vienuolynas, įsikūręs vaizdingame pusiasalyje prie Kauno marių, yra pripažintas vienu tobuliausių brandžiojo baroko šedevrų visoje Šiaurės Rytų Europoje. Jį 1664 m. įkūrė LDK didysis kancleris Kristupas Zigmantas Pacas kaip ramybės ir maldos uostą griežtos kamaldulių vienuolijos atsiskyrėliams.',
      },
      {
        en: "Pac spared no expense, commissioning leading Italian masters from Florence, Venice, and Lugano. Architect Lodovico Fredo and master builder Carlo Puttini designed the church on an ingenious hexagonal plan crowned by a soaring 50-meter dome. Florentine master painter Michelangelo Palloni spent over a decade hand-painting 140 breathtaking fresco compositions across the ceilings, while sculptor Giovanni Battista Merli sculpted ornate white marble altars and stucco garlands.",
        lt: 'Kancleris Pacas nepagailėjo lėšų ir pasikvietė garsiausius meistrus iš Florencijos ir Venecijos. Architektai suprojektavo unikalų šešiakampį bažnyčios planą su didingu kupolu. Florencijos tapytojas Mikelandželas Palonis daugiau nei dešimtmetį tapė 140 įspūdingų freskų, o skulptoriai sukūrė puošnius marmuro altorius.',
      },
      {
        en: "The Camaldolese monks lived in complete silence and solitude within individual white hermit cottages scattered through the garden, meeting only for midnight prayers and communal chanting. Over centuries, through devastating wars, Tsarist closures, and Soviet hospital expropriations, the extraordinary artwork and frescoes miraculously survived, sheltered by the thick forest canopy.",
        lt: 'Kamaldulių vienuoliai gyveno visiškoje tyloje atskiruose mažuose nameliuose sode, susirinkdami tik naktinėms maldoms. Per karus ir okupacijas vienuolynas buvo apgadintas, tačiau unikalus freskų grožis stebuklingai išliko iki šių dienų.',
      },
      {
        en: "Today, lovingly stewarded by the Sisters of St. Casimir, Pažaislis is an acclaimed cultural and musical sanctuary. Every summer, the monastery courtyard hosts the prestigious international Pažaislis Music Festival, filling the baroque arcades with the transcendent strains of classical symphonies, sacred choral hymns, and chamber music.",
        lt: 'Šiandien vienuolynu rūpinasi Šv. Kazimiero seserų kongregacija. Kiekvieną vasarą čia vyksta garsusis tarptautinis Pažaislio muzikos festivalis, kurio klasikinės melodijos po atviru dangumi sutraukia tūkstančius muzikos mylėtojų.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In the underground crypt of the church, beneath a heavy granite slab, rests Chancellor Pac with his wife Klara Izabella de Mailly-Lascaris. Legend tells of a secret lead coffer containing their heart urns, sealed with Pac’s golden heraldic double-lily ring.',
        lt: 'Išskirtinis archyvinis faktas: Po bažnyčios grindimis esančioje kriptoje ilsisi fundatoriai Pacai. Archyvai liudija, kad čia buvo paslėptas švininis indas su jų širdimis, užantspauduotas auksiniu dvigubos lelijos herbo žiedu.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Silence and Frescoes: The Legacy of Chancellor Pac',
        lt: 'Tyla ir freskos: Kanclerio Paco palikimas',
      },
      narrator: {
        en: 'Sister Janina (St. Casimir Congregation)',
        lt: 'Sesuo Janina (Šv. Kazimiero seserų vienuolija)',
      },
      musicTrack: {
        en: 'Baroque Chamber Cello & Monastic Silence',
        lt: 'Barokinė violončelė ir vienuolyno tyla',
      },
      duration: '6:30',
    },
    animation: 'bloom',
    colorHex: '#b43a2b',
    latitude: 54.8763,
    longitude: 24.0223,
  },
  {
    id: 'kns-town-hall',
    cityID: 'kns',
    nfcSecretKey: 'ROTUSE-1542',
    title: {
      en: 'Kaunas Town Hall',
      lt: 'Kauno rotušė',
    },
    teaser: {
      en: "The beloved 'White Swan' tower presiding over the historic Hanseatic market square.",
      lt: 'Elegantiškoji „Baltoji gulbė“ istorinėje Hanzos pirklių aikštėje.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 40,
    activities: [
      {
        en: 'Gaze up at the graceful 53-meter white Baroque tower known locally as the White Swan.',
        lt: 'Pasigrožėkite grakščiu 53 metrų bokštu, meiliai vadinamu „Baltąja gulbe“.',
      },
      {
        en: 'Descend into the cool medieval vaulted cellars to inspect the ancient wax melting furnace.',
        lt: 'Nusileiskite į viduramžių rūsius ir pamatykite senovinę vaško lydymo krosnį.',
      },
      {
        en: 'Explore the surrounding cobbled square lined with Hanseatic merchant guild houses.',
        lt: 'Pasivaikščiokite po grįstą aikštę, apsuptą Hanzos pirklių ir amatininkų namų.',
      },
    ],
    story: [
      {
        en: "Rising gracefully in the center of Kaunas Old Town square, the historic Town Hall is an architectural icon affectionately known by Lithuanians as the 'White Swan' (Baltoji gulbė). Its slender 53-meter tower gracefully combines elements of Gothic, Renaissance, and Late Baroque, resembling a proud swan about to take flight from the riverbanks.",
        lt: 'Kauno senamiesčio širdyje stūksanti rotušė yra vienas elegantiškiausių pastatų Lietuvoje, kauniečių meiliai vadinama „Baltąja gulbe“. Jos grakštus 53 metrų bokštas sujungia gotikos, renesanso ir vėlyvojo baroko bruožus, primindamas išdidžią gulbę, tiesiančią sparnus.',
      },
      {
        en: "First constructed in 1542 following the grant of Magdeburg city rights by Grand Duke Alexander, the town hall was the epicentre of civic self-governance, commercial trading laws, and Hanseatic merchant enterprise. In 1771–1780, visionary Kaunas master architect Johann Matecker undertook a comprehensive redesign, raising the elegant Baroque tower and decorating the facade with classical symmetry.",
        lt: 'Pirmasis rotušės pastatas iškilo 1542 m., miestui gavus Magdeburgo teises. Čia posėdžiavo magistratas, veikė teismas ir pirklių iždas. 1771–1780 m. architektas Jonas Matekeris perstatė rotušę ir iškėlė didingą barokinį bokštą, suteikusį pastatui dabartinę išvaizdą.',
      },
      {
        en: "Beneath the polished ground floor lies a fascinating subterranean labyrinth of 15th-century brick cellars. Here, city magistrates held prisoners, locked state weights and measures, and operated the grand municipal wax furnace, where thousands of pounds of Baltic beeswax were melted, inspected, and stamped with the Kaunas bull seal before shipping across Europe.",
        lt: 'Po rotuše plyti paslaptingi XV a. gotikiniai rūsiai. Juose veikė kalėjimas, buvo saugomi etaloniniai svoriai ir veikė didžiulė miesto vaško lydymo krosnis, kurioje lydytas ir antspauduotas Kauno tauru vaškas buvo eksportuojamas į visą Europą.',
      },
      {
        en: "Over centuries, the building has served as a royal residence for Russian Tsars, a munitions magazine, and even an imperial theater. Today, the Town Hall houses the modern Kaunas City Museum and hosts grand civic ceremonies, welcoming lovers who climb the grand staircase to exchange wedding vows under the high stucco ceilings.",
        lt: 'Per ilgus šimtmečius rotušė buvo ir caro rezidencija, ir teatras. Šiandien atnaujintoje rotušėje veikia Kauno miesto muziejus, o jos salėse tradiciškai tuokiasi jaunavedžiai, tęsdami šimtmečių tradicijas.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In the 1970s restoration, archaeologists uncovered a 16th-century concealed stone cache beneath the tower floor containing 400 silver Prague groschen coins hidden by a merchant during the Livonian War.',
        lt: 'Išskirtinis archyvinis faktas: Restauruojant rotušės bokštą po grindimis buvo rastas paslėptas XVI a. pirklių lobis – per 400 sidabrinių Prahos grašių, paslėptų Livonijos karo sumaištyje.',
      },
    ],
    audioGuide: {
      title: {
        en: 'The White Swan: Merchant Bells and Magdeburg Law',
        lt: 'Baltoji gulbė: Pirklių varpai ir Magdeburgo teisė',
      },
      narrator: {
        en: 'Gintaras Česonis (Kaunas Historian)',
        lt: 'Gintaras Česonis (Kauno istorikas)',
      },
      musicTrack: {
        en: 'Hanseatic Lute & Festive Town Square Bells',
        lt: 'Hanzos liutnia ir šventiniai rotušės varpai',
      },
      duration: '5:15',
    },
    animation: 'pulse',
    colorHex: '#b43a2b',
    latitude: 54.8967,
    longitude: 23.8860,
  },
  {
    id: 'kns-aleksotas-funicular',
    cityID: 'kns',
    nfcSecretKey: 'ALEKSOTAS-1935',
    title: {
      en: 'Aleksotas Funicular & Panorama',
      lt: 'Aleksoto funikulierius ir apžvalgos aikštelė',
    },
    teaser: {
      en: 'Vintage 1935 funicular railway climbing to the panoramic rooftop of Kaunas.',
      lt: '1935 m. funikulierius ir įspūdinga Kauno senamiesčio panorama.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 35,
    activities: [
      {
        en: 'Ride the authentic 1935 Swiss cable-driven wooden passenger carriage up the 142-meter hill.',
        lt: 'Pakilkite autentišku 1935 m. mediniu funikulieriaus vagonėliu į 142 metrų kalną.',
      },
      {
        en: 'Stand on the observation terrace overlooking the red roofs of Old Town and Vytautas Bridge.',
        lt: 'Pasigrožėkite nuostabia Kauno senamiesčio ir Vytauto Didžiojo tilto panorama.',
      },
      {
        en: 'Learn how Kaunas blossomed as the temporary interwar European capital of Lithuania.',
        lt: 'Sužinokite, kaip Kaunas tapo modernia ir klestinčia laikinąja tarpukario sostine.',
      },
    ],
    story: [
      {
        en: "Built in 1935 on the steep southern slope of the Nemunas River, the Aleksotas Funicular is one of Europe's oldest operational cable railways and an iconic symbol of Lithuania's interwar golden age. While Vilnius was tragically annexed by Poland between 1919 and 1939, Kaunas served as the Temporary Capital (Laikinoji sostinė), transforming in two decades from a sleepy garrison town into a dazzling European metropolis of modernist architecture and culture.",
        lt: 'Aleksoto funikulierius, pastatytas 1935 m. Nemuno šlaite, yra vienas seniausių veikiančių funikulierių Europoje ir Kauno tarpukario pasididžiavimas. Vilniui esant okupuotam, Kaunas 1919–1939 m. tapo Lietuvos laikinąja sostine ir vos per du dešimtmečius virto moderniu Europos kultūros ir architektūros centru.',
      },
      {
        en: "Designed by engineering firm Curt Rudolph and featuring authentic Swiss traction machinery, the 142-meter railway gently pulls red-and-white wooden carriages up a 30-degree incline. The authentic interior with varnished oak bench seats, brass handrails, and cable bells transports riders straight back to the stylish 1930s.",
        lt: 'Funikulierių suprojektavo šveicarų bendrovė, o jo bėgių ilgis siekia 142 metrus. Raudoni mediniai vagonėliai su ąžuoliniais suolais ir žalvario detalėmis iki šiol saugo autentišką ketvirtojo dešimtmečio dvasią ir leidžia pasijusti tikrais laiko keliautojais.',
      },
      {
        en: "At the summit of Aleksotas Hill lies the city's premier observation platform. Looking across the wide silver ribbon of the Nemunas, visitors are treated to an unmatched postcard vista: the Gothic red-brick spire of Vytautas Church, the white tower of the Town Hall, Kaunas Castle, and the green hills of Žaliakalnis stretching toward the horizon.",
        lt: 'Užkilus į kalno viršūnę atsiveria gražiausia Kauno panorama: Nemuno vingis, Vytauto Didžiojo bažnyčios gotikiniai bokštai, Rotušės „Baltoji gulbė“ ir Kauno pilies kontūrai. Tai vieta, kurioje Kauno grožis atsiskleidžia visa savo didybe.',
      },
      {
        en: "In 2023, the interwar architecture of Kaunas—including its historic transport infrastructure—was officially inscribed onto the UNESCO World Heritage list, recognizing its exceptional modernist urban spirit. A ride on the Aleksotas funicular remains an essential and unforgettable journey for any traveler to Lithuania.",
        lt: '2023 m. Kauno tarpukario modernizmo architektūra buvo įrašyta į UNESCO pasaulio paveldo sąrašą. Pasivažinėjimas Aleksoto funikulieriumi yra nepamirštama patirtis kiekvienam, norinčiam pajusti tikrąją Kauno dvasią.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In the interwar period, the bridge below Aleksotas was famous as the ‘Longest Bridge in the World’ because crossing from Kaunas to Aleksotas crossed time zones: tsarist Aleksotas used the Gregorian calendar while the city opposite used Julian, taking 13 days to cross!',
        lt: 'Išskirtinis archyvinis faktas: XIX a. tiltas po Aleksoto kalnu buvo juokais vadinamas „ilgiausiu pasaulyje“, nes juo pereiti prireikdavo net 13 dienų: Aleksote galiojo Grigaliaus kalendorius, o Kaune – Julijaus!',
      },
    ],
    audioGuide: {
      title: {
        en: 'Wheels of Modernism: The Interwar Temporary Capital',
        lt: 'Modernizmo ratai: Tarpukario laikinoji sostinė',
      },
      narrator: {
        en: 'Jonas Oškinis (Kaunas Guide)',
        lt: 'Jonas Oškinis (Kauno gidas)',
      },
      musicTrack: {
        en: 'Interwar Foxtrot Piano & Cable Car Rhythms',
        lt: 'Tarpukario fokstroto fortepijonas ir funikulieriaus garsai',
      },
      duration: '4:55',
    },
    animation: 'wave',
    colorHex: '#b43a2b',
    latitude: 54.8916,
    longitude: 23.8872,
  },
  {
    id: 'kns-ninth-fort',
    cityID: 'kns',
    nfcSecretKey: 'FORTAS-1913',
    title: {
      en: 'Ninth Fort Memorial',
      lt: 'Kauno IX fortas ir memorialas',
    },
    teaser: {
      en: 'Monumental Tsarist fortress and sculpted monument to human resilience.',
      lt: 'Monumentali tvirtovė ir memorialas žmogaus dvasios stiprybei.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 60,
    activities: [
      {
        en: 'Stand in awe before the 32-meter sculpted raw concrete monument by Alfonsas Ambraziūnas.',
        lt: 'Atsistokite priešais 32 metrų monumentalią Alfonso Ambraziūno betono skulptūrą.',
      },
      {
        en: 'Descend through damp underground casemates and dark subterranean artillery galleries.',
        lt: 'Nusileiskite į drėgnus požeminius kazamatus ir artilerijos tunelius.',
      },
      {
        en: 'Learn the daring Christmas Eve escape of 64 prisoners who sawed through iron doors in 1943.',
        lt: 'Sužinokite apie drąsų 64 kalinių pabėgimą per 1943 m. Kūčių naktį.',
      },
    ],
    story: [
      {
        en: "Rising atop the northern hills of Kaunas, the Ninth Fort is a site of colossal scale, deep solemnity, and profound historical power. Completed in 1913 on the eve of World War I, it was the final and most technologically advanced stronghold of the massive Kaunas Fortress ring, designed by Tsarist military engineers with reinforced concrete walls, armored artillery domes, and underground subterranean counter-mine galleries.",
        lt: 'Kauno šiauriniame pakraštyje stūksantis IX fortas yra didžiulės istorinės atminties ir pagarbos vieta. Baigtas statyti 1913 m. prieš pat Pirmąjį pasaulinį karą, jis buvo moderniausia Kauno tvirtovės dalis su storomis gelžbetonio sienomis, šarvuotais patrankų kupolais ir požeminiais kazamatais.',
      },
      {
        en: "During the 1920s and 30s, the fort was repurposed as a hard-labor branch of Kaunas prison. But its darkest chapter unfolded during World War II under Nazi occupation, when the fortress was turned into a tragic place of mass execution where tens of thousands of Lithuanian Jews, intellectuals, and deportees from France, Germany, and Austria were ruthlessly murdered.",
        lt: 'Tarpukariu čia veikė Kauno sunkiųjų darbų kalėjimo skyrius. Tačiau tragiškiausias forto etapas prasidėjo Antrojo pasaulinio karo metais, kuomet naciai pavertė fortą masinių žudynių vieta, kurioje žuvo dešimtys tūkstančių Lietuvos ir Vakarų Europos piliečių.',
      },
      {
        en: "Amidst the darkness, an astonishing story of human courage emerged. On Christmas Eve, December 24th, 1943, sixty-four prisoners assigned to burn evidence of war crimes organized a legendary mass escape. Using a hidden hand-hacksaw, they spent weeks secretly sawing through a heavy iron security door, slipped past armed guard towers into the freezing winter night, and successfully joined partisan resistance units.",
        lt: 'Nepaisant žiaurios priespaudos, čia gimė ir neįtikėtinos drąsos žygdarbis: 1943 m. Kūčių naktį 64 mirtininkai sugebėjo slapta perpjauti geležines duris ir nepastebėti sargybinių pabėgti į laisvę per apsnigtus laukus, prisijungdami prie pasipriešinimo.',
      },
      {
        en: "In 1984, atop the mass execution fields, sculptors Alfonsas Ambraziūnas, Gediminas Baravykas, and Vytautas Vielius raised an unforgettable 32-meter high monument composed of three colossal, fractured concrete figures breaking forth from the earth. Symbolizing human pain, struggle, and immortal spiritual rebirth, it is globally celebrated as a masterpiece of expressive modernist memorial sculpture.",
        lt: '1984 m. šalia forto iškilo unikalus 32 metrų monumentas, sukurtas skulptoriaus Alfonso Ambraziūno. Trys į viršų besiveržiančios betono skulptūrinės grupės simbolizuoja skausmą, kovą ir nepalaužiamą žmogaus dvasios prisikėlimą. Tai vienas galingiausių memorialinių paminklų Europoje.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Carved into the damp stone walls of the subterranean execution cells, modern conservators preserved handwritten farewell messages scratched into the plaster in French, German, and Yiddish, including the poignant inscription: ‘Nous sommes 900 Français... Nous sommes innocents’ (We are 900 Frenchmen... We are innocent).',
        lt: 'Išskirtinis archyvinis faktas: Forto požemių sienose iki šiol išliko kalinių prieš mirtį įrėžti atsisveikinimo žodžiai prancūzų, vokiečių ir jidiš kalbomis: „Mes esame 900 prancūzų... Mes esame nekalti“.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Concrete and Memory: The Courage of the Ninth Fort',
        lt: 'Betonas ir atmintis: IX forto drąsa',
      },
      narrator: {
        en: 'Marius Pečiulis (Museum Historian)',
        lt: 'Marius Pečiulis (Muziejaus istorikas)',
      },
      musicTrack: {
        en: 'Subterranean Wind Drone & Resonant Memorial Bells',
        lt: 'Požemių vėjo dvelksmas ir memorialo varpai',
      },
      duration: '6:20',
    },
    animation: 'bloom',
    colorHex: '#b43a2b',
    latitude: 54.9453,
    longitude: 23.8703,
  },
  {
    id: 'plg-sea-pier',
    cityID: 'plg',
    nfcSecretKey: 'BALTIJA-1882',
    title: {
      en: 'Palanga Sea Pier',
      lt: 'Palangos tiltas į jūrą',
    },
    teaser: {
      en: 'Historic 470-meter wooden bridge stretching into the rolling amber waves of the Baltic.',
      lt: 'Garsusis 470 metrų tiltas, besidriekiantis į banguojančią Baltijos jūrą.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 40,
    activities: [
      {
        en: 'Walk out 470 meters into the Baltic Sea to watch the iconic golden sunset over the horizon.',
        lt: 'Nueikite 470 metrų į Baltijos jūrą ir pasigrožėkite auksiniu saulėlydžiu.',
      },
      {
        en: 'Listen to the rhythmic roar of the waves and smell the pine-infused salty sea air.',
        lt: 'Pasiklausykite bangų mūšos ir įkvėpkite jodu kvepiančio pajūrio oro.',
      },
      {
        en: 'Stroll down Basanavičiaus promenade lined with summer cafes and street musicians.',
        lt: 'Pasivaikščiokite gyvybinga J. Basanavičiaus alėja, vedančia link jūros.',
      },
    ],
    story: [
      {
        en: "Stretching like an elegant open-air promenade 470 meters into the wild surf of the Baltic Sea, the Palanga Sea Pier (Palangos tiltas) is the quintessential symbol of the Lithuanian seaside. First constructed in 1882 by Count Juozapas Tiškevičius, the original wooden pier was conceived not merely for romantic strolls, but as a commercial wharf where steamships could dock to load bricks fired in the Count's Palanga brickworks and transport passengers to Liepāja.",
        lt: 'Palangos tiltas į jūrą, besidriekiantis 470 metrų į banguojančią Baltiją, yra neatsiejamas Lietuvos pajūrio simbolis. Pirmasis medinis tiltas čia iškilo 1882 m. grafo Juozapo Tiškevičiaus rūpesčiu: prie jo švartuodavosi garlaiviai, gabenę plytas į Liepoją ir plukdę pirmuosius poilsiautojus.',
      },
      {
        en: "As commercial shipping ceased, the pier blossomed into the social heart of Palanga's aristocratic resort. Noble vacationers, artists, and statesmen promenaded along the wooden planks in summer finery to breathe the therapeutic maritime ozone and pine breezes. In 1899, on the beach beside the pier, Lithuanian patriots staged 'America in the Bathhouse' (Amerika pirtyje)—the very first public Lithuanian-language theatrical performance in history.",
        lt: 'Laivybai nutrūkus, tiltas tapo mėgstamiausia kurorto pasivaikščiojimų vieta. Čia rinkosi aristokratai, menininkai ir rašytojai. 1899 m. šalia tilto esančioje daržinėje buvo suvaidintas pirmasis viešas lietuviškas spektaklis „Amerika pirtyje“, tapęs svarbiu tautinio atgimimo įvykiu.',
      },
      {
        en: "Battered continuously by brutal winter storms and pack ice, the original wooden pilings were repeatedly damaged. In 1998, Lithuanian civil engineers completed a masterwork of coastal engineering, rebuilding the pier upon massive reinforced concrete piles anchored deep in the seabed, overlaid with thick aromatic wooden planks that withstand the Baltic storms.",
        lt: 'Jūros bangų ir žiemos audrų ne kartą apgadintas medinis tiltas 1998 m. buvo iš esmės perstatytas ant galingų gelžbetoninių polių, išlaikant tradicinį medinio tako jaukumą ir atsparumą Baltijos stichijoms.',
      },
      {
        en: "For generations of Lithuanians and international visitors, walking to the edge of the pier at twilight to applaud as the glowing red sun dips beneath the sea line has become an essential and joyful pilgrimage ritual—a timeless moment of unity between humanity and the eternal Baltic waves.",
        lt: 'Jau daugelį dešimtmečių vakarinis pasivaikščiojimas iki tilto galo ir saulėlydžio palydėjimas plojimais yra tapęs gražia tradicija ir nepamirštamu kiekvienos kelionės į Palangą akcentu.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: During strong autumn gales, underwater rip currents scour the seabed at the terminus of the pier, frequently washing ancient raw amber stones right onto the shallow shorelines beside the pilings, collected at dawn by local amber hunters with nets.',
        lt: 'Išskirtinis archyvinis faktas: Po stiprių rudens audrų srovės prie tilto polių išjudina jūros dugną, ir auštant vietiniai gintarautojai su graibštais čia sugauna stambiausius natūralaus gintaro luitus.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Whispers of the Baltic Surf: Sunset on the Planks',
        lt: 'Baltijos bangų šnabždesys: Saulėlydis ant tilto',
      },
      narrator: {
        en: 'Ingrida Šešelgienė (Palanga Resident & Guide)',
        lt: 'Ingrida Šešelgienė (Palangos gidė)',
      },
      musicTrack: {
        en: 'Rolling Sea Waves & Nostalgic Acoustic Guitar',
        lt: 'Jūros bangų ošimas ir nostalgiška akustinė gitara',
      },
      duration: '5:25',
    },
    animation: 'wave',
    colorHex: '#007791',
    latitude: 55.9189,
    longitude: 21.0503,
  },
  {
    id: 'plg-amber-museum',
    cityID: 'plg',
    nfcSecretKey: 'GINTARAS-1897',
    title: {
      en: 'Palanga Amber Museum',
      lt: 'Palangos gintaro muziejus',
    },
    teaser: {
      en: "Count Tiškevičius' palace housing Europe’s premier collection of Baltic amber.",
      lt: 'Grafo Tiškevičiaus rūmai su turtingiausia Baltijos gintaro kolekcija.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 60,
    activities: [
      {
        en: 'Inspect prehistoric insects and fossilized lizards trapped in golden amber 50 million years ago.',
        lt: 'Apžiūrėkite priešistorinius vabzdžius ir driežus, įkalintus gintare prieš 50 mln. metų.',
      },
      {
        en: 'Marvel at the legendary Sun Stone (Saulės akmuo), one of Europe’s largest amber nuggets (3.5 kg).',
        lt: 'Pamatykite legendinį „Saulės akmenį“ – vieną didžiausių gintaro luitų Europoje (3,5 kg).',
      },
      {
        en: 'Stroll across the grand palace terrace overlooking the rose garden designed by Édouard André.',
        lt: 'Išeikite į didingą rūmų terasą, žvelgiančią į Eduardo Andrė suprojektuotą rožyną.',
      },
    ],
    story: [
      {
        en: "Set in the emerald heart of Birutė Botanical Park, the Palanga Amber Museum occupies the sumptuous neo-Renaissance palace built in 1897 for Count Feliks Tiškevičius. Designed by celebrated German court architect Franz Schwechten, the stately residence with its grand terraces, Corinthian porticos, and marble fireplaces was the summer home of the Baltic nobility.",
        lt: 'Palangos gintaro muziejus įsikūręs nuostabiuose neorenesansiniuose grafo Felikso Tiškevičiaus rūmuose, pastatytuose 1897 metais. Garsaus vokiečių architekto Franco Švechteno suprojektuoti rūmai su erdviomis terasomis ir marmuro židiniais buvo Tiškevičių vasaros rezidencija.',
      },
      {
        en: "The palace is encircled by one of Europe's most exquisite coastal botanical parks, designed by famed French landscape master Édouard André and his son René. Skillfully integrating natural coastal sand dunes, freshwater ponds, and ancient pine forests, André planted over 500 varieties of exotic trees and shrubs, creating winding paths where swans glide on mirror-like waters.",
        lt: 'Rūmus supa nepaprasto grožio parkas, kurį sukūrė garsus prancūzų kraštovaizdžio architektas Eduardas Andrė. Jis meistriškai sujungė pajūrio kopas, pušynus ir tvenkinius su egzotiniais augalais, sukursdamas pasakišką gamtos oazę.',
      },
      {
        en: "Opened as an amber museum in 1963, the collection now boasts more than 30,000 amber specimens, celebrating the miraculous resin that dripped from ancient Paleogene pine trees fifty million years ago. Visitors peer through magnifying lenses at astonishing inclusions: perfectly preserved mosquitoes, spiders, ants, and ancient plant spores frozen in eternal golden transparency.",
        lt: '1963 m. rūmuose atidarytas Gintaro muziejus šiandien saugo daugiau nei 30 000 unikalių eksponatų. Čia lankytojai pro didinamuosius stiklus gali pamatyti prieš 50 milijonų metų gintaro sakuose sustingusius vorus, uodus ir augalų žiedus, išsaugotus tobulu pavidalu.',
      },
      {
        en: "The crowning glory of the collection is the legendary 'Sun Stone' (Saulės akmuo), a colossal honey-yellow nugget weighing 3.524 kilograms, making it the third-largest amber piece in the world. According to poetic Baltic myth, all amber is fragments of the underwater palace of the sea goddess Jūratė, shattered by the thunderbolts of Perkūnas when she dared to love the mortal fisherman Kastytis.",
        lt: 'Didžiausias muziejaus pasididžiavimas – „Saulės akmuo“, sveriantis net 3,524 kg. Pasak legendos, gintaras yra jūrų deivės Jūratės gintarinių rūmų liekanos, Perkūno sudaužytos į šukes už jos meilę paprastam žvejui Kastyčiui.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: In 2001, the famous 3.5 kg Sun Stone was stolen in a daring heist and was missing for a month before being recovered unharmed; security teams subsequently installed laser-guided bulletproof vaults.',
        lt: 'Išskirtinis archyvinis faktas: 2001 m. garsusis „Saulės akmuo“ buvo pagrobtas, tačiau po mėnesio sėkmingai sugrąžintas į muziejų; dabar jis saugomas specialioje neperšaunamoje vitrinoje.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Tears of the Sun: 50 Million Years of Golden Lore',
        lt: 'Saulės ašaros: 50 milijonų metų gintaro istorija',
      },
      narrator: {
        en: 'Dr. Sigita Bagužaitė-Talačkienė (Amber Curator)',
        lt: 'Dr. Sigita Bagužaitė-Talačkienė (Gintaro kuratorė)',
      },
      musicTrack: {
        en: 'Baltic Kanklės & Gentle Seaside Harp',
        lt: 'Lietuviškos kanklės ir rami pajūrio arfa',
      },
      duration: '6:10',
    },
    animation: 'bloom',
    colorHex: '#007791',
    latitude: 55.9066,
    longitude: 21.0558,
  },
  {
    id: 'plg-birute-hill',
    cityID: 'plg',
    nfcSecretKey: 'BIRUTE-1350',
    title: {
      en: 'Birutė Hill & Sacred Grotto',
      lt: 'Birutės kalnas ir grota',
    },
    teaser: {
      en: 'Ancient coastal pagan sanctuary honoring the vestal virgin Grand Duchess Birutė.',
      lt: 'Senoji pagoniška šventvietė, sauganti kunigaikštienės Birutės atminimą.',
    },
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    durationMinutes: 40,
    activities: [
      {
        en: 'Climb the highest coastal relict sand dune in Palanga sheltered by maritime pines.',
        lt: 'Užlipkite į aukščiausią Palangos kopą, apsuptą šimtamečių pušų.',
      },
      {
        en: 'Visit the red-brick neo-Gothic octagonal chapel built in 1869 at the crest.',
        lt: 'Apžiūrėkite 1869 m. kalno viršūnėje pastatytą raudonų plytų aštuonkampę koplyčią.',
      },
      {
        en: 'Touch the sacred stone grotto at the base dedicated to the Virgin of Lourdes.',
        lt: 'Pabūkite prie kalno papėdėje esančios akmeninės Lurdo grotos.',
      },
    ],
    story: [
      {
        en: "Rising 22 meters above sea level as the highest relict sand dune on the Lithuanian coastline, Birutė Hill is steeped in centuries of romance, Baltic pagan spirituality, and patriotic lore. Long before grand resorts existed, this forested dune was an ancient pagan sanctuary where Baltic priestesses (Vaidilutės) kept an eternal sacred fire burning in honor of the gods of sea and sky.",
        lt: 'Birutės kalnas, iškilęs 22 metrus virš jūros lygio, yra aukščiausia kopa Palangoje ir viena garsiausių Lietuvos šventviečių. XIV amžiuje čia veikė pagoniška šventykla, kurioje vaidilutės kūreno amžinąją ugnį dievams.',
      },
      {
        en: "According to the 16th-century Bychowiec Chronicle, the most celebrated vestal virgin tending the holy fire was the beautiful noblewoman Birutė. Grand Duke Kęstutis of Trakai, riding past with his war detachment, saw her, fell deeply in love with her grace and purity, and asked for her hand. Birutė initially refused, having vowed her life to the sacred fire, but Kęstutis took her to Trakai with great honor, where they were married in grand royal celebration. She became the mother of Lithuania’s greatest sovereign, Vytautas the Great.",
        lt: 'Pasak metraščių, šventąją ugnį čia kurstė vaidilutė Birutė. Pro šalį jodamas LDK kunigaikštis Kęstutis išvydo merginą, pamilo ją iš pirmo žvilgsnio ir paprašė jos rankos. Nors Birutė buvo pasižadėjusi dievams, Kęstutis išsivežė ją į Trakus ir iškėlė vestuves. Birutė pagimdė garsiausią Lietuvos valdovą – Vytautą Didįjį.',
      },
      {
        en: "Archaeological excavations conducted in 1989 uncovered traces of a 14th-century wooden paleo-astronomical solar calendar and pagan observatory on the summit—similar to Stonehenge—where wooden posts measured the summer and winter solstices against the setting Baltic sun.",
        lt: '1989 m. archeologai kalno viršūnėje atrado XIV a. pagoniškos observatorijos liekanas su stulpais, skirtais stebėti saulėlydžius ir nustatyti kalendorines šventes, panašiai kaip garsiajame Stounhendže.',
      },
      {
        en: "In 1869, architect K. Majerski erected a charming red-brick neo-Gothic chapel at the summit, adorned with stained-glass windows honoring St. George and Birutė. At the base of the hill, Count Tiškevičius created an atmospheric Lourdes stone grotto in 1898, where visitors light candles today, continuing an unbroken seven-century tradition of lighting sacred flames upon this coastal crest.",
        lt: '1869 m. ant kalno iškilo grakšti raudonų plytų neogotikinė koplyčia, o 1898 m. grafas Tiškevičius kalno papėdėje įrengė Lurdo grotą. Ir šiandien čia dega žvakės, tęsdamos septynių šimtmečių ugnies tradiciją.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Chroniclers record that after Duke Kęstutis was tragically murdered in Krėva in 1382, Birutė returned to this hill to live in prayer until her death, and local fishermen secretly buried her at the base of the dune.',
        lt: 'Išskirtinis archyvinis faktas: Metraščiai teigia, kad po Kęstučio nužudymo Birutė grįžo į Palangą ir čia gyveno iki mirties, o vietiniai gyventojai ją su didele pagarba palaidojo kalno papėdėje.',
      },
    ],
    audioGuide: {
      title: {
        en: 'Eternal Fire by the Sea: The Legend of Birutė and Kęstutis',
        lt: 'Amžinoji ugnis prie jūros: Birutės ir Kęstučio legenda',
      },
      narrator: {
        en: 'Danutė Mukienė (Samogitian Cultural Historian)',
        lt: 'Danutė Mukienė (Žemaičių kultūros tyrinėtoja)',
      },
      musicTrack: {
        en: 'Ancient Baltic Daudytės & Sea Pine Wind Drone',
        lt: 'Senosios daudytės ir pušyno ošimas',
      },
      duration: '5:45',
    },
    animation: 'pulse',
    colorHex: '#007791',
    latitude: 55.9022,
    longitude: 21.0536,
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
        en: 'Emerging like a fairytale mirage from the mist-shrouded waters of Lake Galvė, Trakai Island Castle is one of Europe’s rarest medieval island strongholds. According to romantic Baltic chronicles, Grand Duke Kęstutis began constructing the fortress in the late 14th century because his beloved pagan wife, Duchess Birutė, grew sorrowful living in dry hill forts and longed for the whispering waves of her coastal homeland. Engineers selected a natural glacial island, driving thousands of oak timber pylons into the lakebed to support towering granite and red gothic brick ramparts.',
        lt: 'Kylanti iš Galvės ežero vandenų, Trakų salos pilis yra viena rečiausių viduramžių salos tvirtovių visoje Europoje. Pasak metraščių, kunigaikštis Kęstutis pradėjo jos statybas, nes jo mylima žmona Birutė ilgėjosi vandenų, prie kurių užaugo Palangoje. Ant ežero salos buvo supilti pylimai ir sukaltos ąžuolinės poliai, ant kurių iškilo raudonų plytų gynybiniai bokštai.',
      },
      {
        en: 'Completed in 1409 by Kęstutis’s legendary son, Grand Duke Vytautas the Great, Trakai Island Castle became the impregnable political capital and military headquarters of the Grand Duchy of Lithuania. Following the crushing defeat of the Teutonic Knights at Grunwald in 1410, Vytautas welcomed ambassadors from the Holy Roman Empire, Moscow, and the Byzantine Court inside the vaulted Great Hall. The royal residence boasted advanced medieval hypocaust underfloor central heating systems, stained-glass heraldic windows, and defensive drawbridges that thwarted every attacker.',
        lt: 'Pilis baigta statyti 1409 m. Vytauto Didžiojo ir tapo viena moderniausių to meto rezidencijų. Po pergalės Žalgirio mūšyje didžiojoje menėje Vytautas priiminėjo užsienio pasiuntinius. Rūmai turėjo pažangią grindinio šildymo sistemą, vitražinius langus, pakeliamus tiltus ir galingus donžonus, saugojusius valdovo ramybę.',
      },
      {
        en: 'In 1397, following his triumphant campaigns across the Crimean steppes, Vytautas brought several hundred Karaim families to Trakai. A Turkic ethnic group practicing a distinct form of Judaism, the Karaims served as the Grand Duke’s most trusted personal bodyguards, palace guards, and master bowmen. Over six centuries, the Karaims maintained their unique Turkic Kipchak language, distinctive wooden architecture with three front windows, and world-renowned culinary tradition of hand-crimped pastry pockets known as kibinai.',
        lt: '1397 metais Vytautas Didysis iš Krymo žygių atsivežė kelis šimtus karaimų šeimų. Šie ištikimi kariai tapo asmenine valdovo gvardija ir pilies sargais. Jau daugiau nei 600 metų karaimai Trakuose saugo savo tiurkišką kalbą, medinius namus su trimis langais ir tradicinius pyragėlius su kapota mėsa – kibinus.',
      },
      {
        en: 'Devastated during the 17th-century wars with Sweden and Muscovy, the castle lay in romantic, water-lapped ruins for nearly three hundred years, inspiring poets and artists. In the 1950s and 60s, defying Soviet ideological opposition, passionate Lithuanian architects and stone carvers meticulously resurrected the castle brick by brick according to original medieval blueprints. Today, Trakai Castle stands as Lithuania’s proudest medieval crown jewel, drawing travelers from across the globe across its famous wooden footbridge.',
        lt: 'Po XVII a. karų pilis ilgus amžius stovėjo apgriuvusi ežero bangose. Tačiau XX a. viduryje lietuvių restauratoriai, nepaisydami sovietų valdžios kliūčių, kruopščiai atstatė pilį pagal istorinius brėžinius. Šiandien Trakų pilis yra Lietuvos pasididžiavimas, pasitinkantis keliautojus mediniu tiltu virš Galvės ežero.',
      },
    ],
    secretLore: [
      {
        en: 'Exclusive Archival Secret: Underwater excavations in Lake Galvė revealed submerged stone causeways and sunken oak dugouts from the 14th century, confirming that during winters of extreme cold, knights and couriers rode armored warhorses straight across the frozen ice to the castle gates.',
        lt: 'Išskirtinis archyvinis faktas: Povandeniniai archeologiniai tyrimai Galvės ežero dugne atrado XIV a. nuskendusias luotas ir medinius polius, liudijančius, kad žiemą riteriai į pilį jodavo tiesiai užšalusiu ežero ledu.',
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
      duration: '6:40',
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
        en: 'Rising quietly above the windswept agricultural plains of northern Lithuania, the Hill of Crosses is a site of awe and deep spiritual reverence unlike anywhere else on Earth. Originally the earthen mound of a 14th-century fortified Baltic hill fort called Jurgaičiai, the tradition of placing crosses began in the bitter aftermath of the anti-Tsarist Uprisings of 1831 and 1863. Cruel imperial authorities forbade families from burying or marking the graves of young fallen insurgent fighters. Unable to recover their sons’ bodies, grieving parents walked miles in darkness to plant simple wooden crosses on this hill in silent memorial.',
        lt: 'Kryžių kalnas šalia Šiaulių yra unikali vieta visame pasaulyje. Šioje vietoje XIV a. stovėjo medinė Jurgaičių piliakalnio tvirtovė. Pirmieji kryžiai čia atsirado po 1831 ir 1863 m. sukilimų prieš caro valdžią. Carinė valdžia draudė laidoti žuvusius sukilėlius, todėl artimieji, neturėdami kur uždegti žvakės, slapta nešė ir statė medinius kryžius ant šio piliakalnio.',
      },
      {
        en: 'During the post-World War II Soviet occupation, the totalitarian regime viewed this gathering place of prayer as an intolerable threat to state atheism and Lithuanian identity. Between 1961 and 1975, the KGB mobilized heavy military bulldozers at least five times under armed guard. They crushed tens of thousands of wooden crosses into towering bonfires, bulldozed earth into ditches, and ground metal crucifixes into scrap iron. KGB patrols laid sewage pipes and warned that anyone approaching the hill faced exile to Siberian labor camps. Yet every single night, courageous local citizens slipped past Soviet guards under the cover of darkness, planting dozens of new crosses by morning light.',
        lt: 'Sovietų okupacijos metais valdžia bandė sunaikinti šį tikėjimo ir pasipriešinimo simbolį. Tarp 1961 ir 1975 m. KGB buldozeriais nulygino kalną net penkis kartus: kryžiai buvo verčiami, deginami laužuose, o geležiniai – vežami į metalo laužą. Tačiau kiekvieną naktį, nepaisydami pavojaus būti ištremtiems į Sibirą, žmonės vėl ir vėl slapta nešė naujus kryžius.',
      },
      {
        en: 'On September 7th, 1993, just one week after the final Soviet occupation troops were expelled from independent Lithuania, Pope John Paul II arrived at the Hill of Crosses. Walking in solemn contemplation among the sea of wooden monuments, he knelt in prayer and celebrated Mass before 100,000 weeping pilgrims. He erected a magnificent stone and bronze crucifix at the base and proclaimed to the globe: ‘Thank you, Lithuanians, for this Hill of Crosses which testifies to the nations of Europe and the whole world the faith of the people of this land.’',
        lt: '1993 m. rugsėjo 7 d., praėjus vos savaitei po Rusijos kariuomenės išvedimo, Kryžių kalne apsilankė popiežius Jonas Paulius II. Jis aukojo šv. Mišias šimtui tūkstančių maldininkų, padovanojo didžiulį kryžių ir pasakė: „Ačiū jums, lietuviai, už šį Kryžių kalną, kuris liudija visai Europai ir pasauliui šios žemės žmonių tikėjimą ir ištikimybę laisvei.“',
      },
      {
        en: 'Today, more than one hundred thousand crosses cover the double hills—towering hand-carved oak sculptures of the Pensive Christ (Rūpintojėlis), stone crucifixes, and countless miniature rosaries hung by travelers from every nation. When the Baltic wind blows across the open plains, thousands of beads and metal chimes ring in a hypnotic, continuous whisper of peace, memory, and unbreakable human endurance.',
        lt: 'Šiandien kalną puošia daugiau nei 100 000 įvairiausių kryžių – nuo didingų ąžuolinių Rūpintojėlių iki mažiausių rožinių, atvežtų iš tolimiausių pasaulio kampelių. Kai vėjas glosto kalno šlaitus, tūkstančiai rožinių suvirpa tyliu skambesiu – tarsi gyva, nemirtinga vilties ir laisvės malda.',
      },
    ],
    secretLore: [
      {
        en: "Exclusive Archival Secret: During the height of Soviet KGB surveillance in the 1970s, secret resistance couriers hid typed samizdat copies of the banned 'Chronicle of the Catholic Church in Lithuania' inside hollowed-out wooden cross bases on the hill before smuggling them across the Iron Curtain.",
        lt: 'Išskirtinis archyvinis faktas: Sovietmečiu pogrindžio kovotojai tuščiaviduriuose kryžių pagrinduose slėpdavo draudžiamą „Lietuvos Katalikų Bažnyčios kroniką“, kuri vėliau slapta būdavo išgabenama į Vakarus.',
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
      duration: '6:50',
    },
    animation: 'bloom',
    colorHex: '#1d5c38',
    latitude: 56.0153,
    longitude: 23.4164,
  },
];

/**
 * Returns full concatenated historical narration for a spot, including intro and secret lore.
 */
export function getFullHistoryText(spot: Spot, lang: AppLanguage = 'en'): string {
  const chapters = (spot.story || []).map((chap, idx) => {
    const chapNum = idx + 1;
    const prefix = lang === 'lt' ? `Dalis ${chapNum}: ` : `Chapter ${chapNum}: `;
    return `${prefix}${resolveText(chap, lang)}`;
  });

  if (spot.secretLore && spot.secretLore.length > 0) {
    const secretPrefix =
      lang === 'lt'
        ? 'Išskirtinis archyvinis faktas: '
        : 'Exclusive Archival Secret: ';
    chapters.push(secretPrefix + resolveText(spot.secretLore[0], lang));
  }

  return chapters.join('\n\n');
}
