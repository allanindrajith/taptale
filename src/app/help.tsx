import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PhotoCreditsSheet } from '@/components/photo-credits';
import { Button, Card, Header, IconName, Screen, SectionHeader, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { NfcService } from '@/services/nfc-service';

type NfcStatus = 'checking' | 'ready' | 'off' | 'missing';

interface Step {
  icon: IconName;
  en: string;
  lt: string;
}

const STEPS: Step[] = [
  {
    icon: 'location-outline',
    en: 'Find a TapTale plaque at a historic place. Open the place in Explore and tap “Directions” to get there.',
    lt: 'Suraskite TapTale lentelę prie istorinės vietos. Atidarykite vietą skiltyje „Atrasti“ ir paspauskite „Maršrutas“.',
  },
  {
    icon: 'phone-portrait-outline',
    en: 'Tap “Scan plaque” and hold the top of your phone against the plaque. No NFC? Tap “Enter code” instead.',
    lt: 'Paspauskite „Skenuoti lentelę“ ir priglauskite telefono viršų prie lentelės. Nėra NFC? Paspauskite „Įvesti kodą“.',
  },
  {
    icon: 'headset-outline',
    en: 'Read the story, or press play to hear it (Story) or listen to Music. It stays unlocked for 30 days.',
    lt: 'Skaitykite istoriją arba paspauskite „Groti“ ir klausykitės („Istorija“ ar „Muzika“). Ji lieka atrakinta 30 dienų.',
  },
];

interface Faq {
  qEn: string;
  qLt: string;
  aEn: string;
  aLt: string;
}

const FAQS: Faq[] = [
  {
    qEn: 'My phone doesn’t have NFC',
    qLt: 'Mano telefonas neturi NFC',
    aEn: 'Every plaque has a code printed under the NFC logo. Tap “No NFC? Enter the code” on Explore, or “Enter code instead” on a place, and type it. The code only works when you’re standing at the plaque (within 10 m), so keep location on.',
    aLt: 'Kiekviena lentelė turi kodą po NFC ženklu. Skiltyje „Atrasti“ paspauskite „Nėra NFC? Įveskite kodą“ arba vietos puslapyje – „Įvesti kodą“ ir įveskite jį. Kodas veikia tik stovint prie pat lentelės (iki 10 m), todėl palikite įjungtą vietovės nustatymą.',
  },
  {
    qEn: 'Where is the NFC reader on my phone?',
    qLt: 'Kur mano telefone yra NFC skaitytuvas?',
    aEn: 'iPhone: the top edge, near the camera. Android: usually the middle of the back. Hold still for a second or two.',
    aLt: 'iPhone: viršutinis kraštas, prie kameros. Android: dažniausiai nugarėlės viduryje. Palaikykite telefoną nejudindami sekundę ar dvi.',
  },
  {
    qEn: 'How do I get to a place?',
    qLt: 'Kaip nuvykti į vietą?',
    aEn: 'Open the place and tap “Directions”. It opens Apple Maps on iPhone or Google Maps on Android.',
    aLt: 'Atidarykite vietą ir paspauskite „Maršrutas“. „iPhone“ atsidarys „Apple Maps“, „Android“ – „Google Maps“.',
  },
  {
    qEn: 'Do I need internet?',
    qLt: 'Ar reikia interneto?',
    aEn: 'Not for the stories – they’re built into the app. Narration uses your phone’s own voice, so it may sound different on each phone. Maps and some photos need a connection.',
    aLt: 'Istorijoms – ne, jos yra pačioje programėlėje. Istoriją skaito jūsų telefono balsas, todėl skirtinguose telefonuose ji gali skambėti skirtingai. Žemėlapiams ir kai kurioms nuotraukoms reikia ryšio.',
  },
  {
    qEn: 'What happens after 30 days?',
    qLt: 'Kas nutinka po 30 dienų?',
    aEn: 'The place locks again and its stamp in your Passport shows as locked. Tap the plaque (or enter its code) on your next visit to unlock it for another 30 days. Unlocks are saved on this phone only.',
    aLt: 'Vieta vėl užrakinama, o jos antspaudas jūsų Pase rodomas kaip užrakintas. Kito apsilankymo metu priglauskite telefoną prie lentelės (arba įveskite kodą) ir vieta bus atrakinta dar 30 dienų. Atrakintos vietos saugomos tik šiame telefone.',
  },
];

const PROJECT_URL = 'https://github.com/allanindrajith/TapTale';
const ANDROID_NFC_SETTINGS = 'android.settings.NFC_SETTINGS';

async function detectNfc(): Promise<NfcStatus> {
  try {
    if (!(await NfcService.isHardwareSupported())) return 'missing';
    // On iOS isEnabled() mirrors hardware support (there is no NFC toggle), so 'off' is Android-only.
    return (await NfcService.isEnabled()) ? 'ready' : 'off';
  } catch {
    return 'missing';
  }
}

async function openNfcSettings(language: AppLanguage) {
  try {
    await Linking.sendIntent(ANDROID_NFC_SETTINGS);
    return;
  } catch {
    // Some Android builds don't expose the NFC settings screen; fall back to app settings.
  }
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert(
      tr(language, 'Couldn’t open settings', 'Nepavyko atidaryti nustatymų'),
      tr(language, 'Open Settings and search for “NFC”.', 'Atidarykite nustatymus ir paieškoje įveskite „NFC“.')
    );
  }
}

async function openProjectPage(language: AppLanguage) {
  try {
    await Linking.openURL(PROJECT_URL);
  } catch {
    Alert.alert(
      tr(language, 'Couldn’t open the link', 'Nepavyko atidaryti nuorodos'),
      PROJECT_URL
    );
  }
}

interface StatusView {
  icon: IconName;
  color: string;
  bg: string;
  title: string;
  body: string;
}

function statusView(status: NfcStatus, language: AppLanguage): StatusView {
  switch (status) {
    case 'checking':
      return {
        icon: 'ellipsis-horizontal',
        color: Palette.mute,
        bg: Palette.surfaceMuted,
        title: tr(language, 'Checking NFC…', 'Tikrinamas NFC…'),
        body: '',
      };
    case 'ready':
      return {
        icon: 'checkmark-circle',
        color: Palette.green,
        bg: Palette.greenTint,
        title: tr(language, 'NFC is ready', 'NFC paruoštas'),
        body: tr(language, 'You can scan plaques.', 'Galite skenuoti lenteles.'),
      };
    case 'off':
      return {
        icon: 'alert-circle',
        color: Palette.gold,
        bg: Palette.goldTint,
        title: tr(language, 'NFC is turned off', 'NFC išjungtas'),
        body: tr(language, 'Turn on NFC in your phone settings, then come back.', 'Įjunkite NFC telefono nustatymuose ir grįžkite.'),
      };
    case 'missing':
      return {
        icon: 'keypad',
        color: Palette.inkSoft,
        bg: Palette.surfaceMuted,
        title: tr(language, 'NFC isn’t available', 'NFC nepasiekiamas'),
        body: tr(
          language,
          'This phone can’t scan plaques here. Use the code printed on the plaque instead.',
          'Šiuo telefonu lentelių nuskaityti nepavyks. Naudokite ant lentelės išspausdintą kodą.'
        ),
      };
  }
}

export default function HelpScreen() {
  const { language } = useLanguage();
  const [status, setStatus] = useState<NfcStatus>('checking');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  // Guards against setState after unmount and against an older check finishing after a newer one.
  const checkId = useRef(0);

  const runCheck = () => {
    checkId.current += 1;
    const id = checkId.current;
    detectNfc().then((next) => {
      if (id === checkId.current) setStatus(next);
    });
  };

  const recheck = () => {
    setStatus('checking');
    runCheck();
  };

  useEffect(() => {
    let isActive = true;
    const check = () => {
      checkId.current += 1;
      const id = checkId.current;
      detectNfc().then((next) => {
        if (isActive && id === checkId.current) setStatus(next);
      });
    };
    check();
    // Re-check when returning from system settings.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      isActive = false;
      checkId.current += 1;
      sub.remove();
    };
  }, []);

  const s = statusView(status, language);
  const showSettingsButton = status === 'off' && Platform.OS === 'android';

  return (
    <>
    <Screen>
      <Header title={tr(language, 'How it works', 'Kaip tai veikia')} />

      <View style={[styles.statusCard, { backgroundColor: s.bg }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.body ? `${s.title}. ${s.body}` : s.title}
          accessibilityHint={tr(language, 'Checks NFC again', 'Dar kartą patikrina NFC')}
          accessibilityState={{ busy: status === 'checking' }}
          disabled={status === 'checking'}
          onPress={recheck}
          style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]}>
          <Ionicons name={s.icon} size={28} color={s.color} />
          <View style={styles.flex}>
            <Text style={Type.heading}>{s.title}</Text>
            {s.body ? <Text style={styles.statusBody}>{s.body}</Text> : null}
          </View>
          <Ionicons name="refresh" size={20} color={Palette.mute} />
        </Pressable>
        {showSettingsButton ? (
          <Button
            variant="secondary"
            icon="settings-outline"
            label={tr(language, 'Open NFC settings', 'Atidaryti NFC nustatymus')}
            onPress={() => openNfcSettings(language)}
          />
        ) : null}
      </View>

      <View>
        {STEPS.map((step, i) => (
          <View key={step.icon} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={22} color={Palette.green} />
              </View>
              {i < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepNum}>{tr(language, `Step ${i + 1}`, `${i + 1} žingsnis`)}</Text>
              <Text style={styles.stepText}>{tr(language, step.en, step.lt)}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.note}>
          {tr(
            language,
            'Places you’ve unlocked appear at the top of Explore and as stamps in your Passport.',
            'Atrakintos vietos rodomos skilties „Atrasti“ viršuje ir kaip antspaudai jūsų Pase.'
          )}
        </Text>
      </View>

      <View>
        <SectionHeader title={tr(language, 'Questions', 'Klausimai')} />
        <Card style={styles.faqCard}>
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            const question = tr(language, f.qEn, f.qLt);
            return (
              <View key={f.qEn} style={i > 0 && styles.faqBorder}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={question}
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => setOpenFaq(isOpen ? null : i)}
                  style={({ pressed }) => [styles.faqHead, pressed && styles.pressed]}>
                  <Text style={styles.faqQ}>{question}</Text>
                  <Ionicons name={isOpen ? 'remove' : 'add'} size={22} color={Palette.mute} />
                </Pressable>
                {isOpen ? <Text style={styles.faqA}>{tr(language, f.aEn, f.aLt)}</Text> : null}
              </View>
            );
          })}
        </Card>
      </View>

      <View>
        <SectionHeader title={tr(language, 'More', 'Daugiau')} />
        <Card style={styles.faqCard}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={tr(language, 'About TapTale', 'Apie TapTale')}
            accessibilityHint={tr(language, 'Opens the project page in your browser', 'Atidaro projekto puslapį naršyklėje')}
            onPress={() => openProjectPage(language)}
            style={({ pressed }) => [styles.faqHead, pressed && styles.pressed]}>
            <Ionicons name="information-circle-outline" size={22} color={Palette.green} />
            <Text style={styles.faqQ}>{tr(language, 'About TapTale', 'Apie TapTale')}</Text>
            <Ionicons name="open-outline" size={18} color={Palette.mute} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(language, 'Photo credits', 'Nuotraukų autoriai')}
            onPress={() => setIsCreditsOpen(true)}
            style={({ pressed }) => [styles.faqHead, styles.faqBorder, pressed && styles.pressed]}>
            <Ionicons name="images-outline" size={22} color={Palette.green} />
            <Text style={styles.faqQ}>{tr(language, 'Photo credits', 'Nuotraukų autoriai')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.mute} />
          </Pressable>
        </Card>
      </View>
    </Screen>
    <PhotoCreditsSheet visible={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} language={language} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },

  statusCard: { borderRadius: 18, padding: 16, gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  statusBody: { fontSize: 15, lineHeight: 21, color: Palette.inkSoft },

  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center' },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { flex: 1, width: 2, backgroundColor: Palette.hairline, marginVertical: 4 },
  stepBody: { flex: 1, paddingBottom: 22, paddingTop: 2 },
  stepNum: { ...Type.label, textTransform: 'uppercase' },
  stepText: { fontSize: 17, lineHeight: 25, color: Palette.ink, marginTop: 2 },
  note: { ...Type.body, marginTop: 2 },

  faqCard: { paddingVertical: 4 },
  faqBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.hairline },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  faqQ: { flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '600', color: Palette.ink },
  faqA: { ...Type.body, paddingBottom: 16 },
});
