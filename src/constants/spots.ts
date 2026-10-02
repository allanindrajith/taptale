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
