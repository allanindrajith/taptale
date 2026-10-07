import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, Header, IconName, Screen, SectionHeader, tr } from '@/components/ui/kit';
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
  { icon: 'location-outline', en: 'Find a TapTale plaque at a landmark.', lt: 'Suraskite TapTale lentelę prie lankytinos vietos.' },
  {
    icon: 'phone-portrait-outline',
    en: 'Press “Scan plaque” and hold the top of your phone against it.',
    lt: 'Paspauskite „Skenuoti lentelę“ ir priglauskite telefono viršų.',
  },
  {
    icon: 'headset-outline',
    en: 'Read or listen to the story. It stays unlocked for 30 days.',
    lt: 'Skaitykite ar klausykitės istorijos. Ji atrakinta 30 dienų.',
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
    aEn: 'Every plaque has a code printed under the NFC logo. Tap “Enter code” and type it while you’re next to the plaque.',
    aLt: 'Kiekviena lentelė turi kodą po NFC ženklu. Paspauskite „Įvesti kodą“ ir įveskite jį būdami prie lentelės.',
  },
  {
    qEn: 'Where is the NFC reader on my phone?',
    qLt: 'Kur mano telefone yra NFC skaitytuvas?',
    aEn: 'iPhone: the top edge, near the camera. Android: usually the middle of the back.',
    aLt: 'iPhone: viršutinis kraštas prie kameros. Android: dažniausiai nugarėlės viduryje.',
  },
  {
    qEn: 'Do I need internet?',
    qLt: 'Ar reikia interneto?',
    aEn: 'No. Stories and audio are stored on your phone.',
    aLt: 'Ne. Istorijos ir garsas saugomi jūsų telefone.',
  },
  {
    qEn: 'What happens after 30 days?',
    qLt: 'Kas nutinka po 30 dienų?',
    aEn: 'The story locks again. Tap the plaque on your next visit to renew it.',
    aLt: 'Istorija vėl užsirakina. Kito apsilankymo metu priglauskite telefoną ir pratęskite.',
  },
];

const PROJECT_URL = 'https://github.com/allanindrajith/TapTale';

async function detectNfc(): Promise<NfcStatus> {
  if (!(await NfcService.isHardwareSupported())) return 'missing';
  return (await NfcService.isEnabled()) ? 'ready' : 'off';
}

interface StatusView {
  icon: IconName;
  color: string;
  bg: string;
  title: string;
  body: string;
}

export default function HelpScreen() {
  const { language } = useLanguage();
  const [status, setStatus] = useState<NfcStatus>('checking');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const checkNfc = () => {
    setStatus('checking');
    detectNfc().then(setStatus);
  };

  useEffect(() => {
    let isActive = true;
    detectNfc().then((s) => isActive && setStatus(s));
    return () => {
      isActive = false;
    };
  }, []);

  const statusViews: Record<NfcStatus, StatusView> = {
    checking: {
      icon: 'ellipsis-horizontal',
      color: Palette.mute,
      bg: Palette.surfaceMuted,
      title: tr(language, 'Checking NFC…', 'Tikrinamas NFC…'),
      body: '',
    },
    ready: {
      icon: 'checkmark-circle',
      color: Palette.green,
      bg: Palette.greenTint,
      title: tr(language, 'NFC is ready', 'NFC paruoštas'),
      body: tr(language, 'You can scan plaques.', 'Galite skenuoti lenteles.'),
    },
    off: {
      icon: 'alert-circle',
      color: Palette.gold,
      bg: Palette.goldTint,
      title: tr(language, 'NFC is turned off', 'NFC išjungtas'),
      body: tr(language, 'Turn it on in your phone settings.', 'Įjunkite jį telefono nustatymuose.'),
    },
    missing: {
      icon: 'keypad',
      color: Palette.inkSoft,
      bg: Palette.surfaceMuted,
      title: tr(language, 'No NFC on this device', 'Šiame įrenginyje nėra NFC'),
      body: tr(language, 'Use the code printed on each plaque instead.', 'Naudokite ant lentelės išspausdintą kodą.'),
    },
  };
  const s = statusViews[status];

  return (
    <Screen>
      <Header title={tr(language, 'How it works', 'Kaip tai veikia')} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${s.title}. ${s.body}`}
        accessibilityHint={tr(language, 'Check again', 'Tikrinti dar kartą')}
        onPress={checkNfc}
        style={[styles.status, { backgroundColor: s.bg }]}>
        <Ionicons name={s.icon} size={24} color={s.color} />
        <View style={styles.flex}>
          <Text style={Type.heading}>{s.title}</Text>
          {s.body ? <Text style={Type.small}>{s.body}</Text> : null}
        </View>
        <Ionicons name="refresh" size={18} color={Palette.mute} />
      </Pressable>

      <View>
        {STEPS.map((step, i) => (
          <View key={step.icon} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={20} color={Palette.green} />
              </View>
              {i < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepNum}>{tr(language, `Step ${i + 1}`, `${i + 1} žingsnis`)}</Text>
              <Text style={styles.stepText}>{tr(language, step.en, step.lt)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View>
        <SectionHeader title={tr(language, 'Questions', 'Klausimai')} />
        <Card style={styles.faqCard}>
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <View key={f.qEn} style={i > 0 && styles.faqBorder}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => setOpenFaq(isOpen ? null : i)}
                  style={styles.faqHead}>
                  <Text style={styles.faqQ}>{tr(language, f.qEn, f.qLt)}</Text>
                  <Ionicons name={isOpen ? 'remove' : 'add'} size={20} color={Palette.mute} />
                </Pressable>
                {isOpen ? <Text style={styles.faqA}>{tr(language, f.aEn, f.aLt)}</Text> : null}
              </View>
            );
          })}
        </Card>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(PROJECT_URL).catch(() => {})}
        style={styles.link}>
        <Text style={styles.linkText}>{tr(language, 'About TapTale', 'Apie TapTale')}</Text>
        <Ionicons name="open-outline" size={14} color={Palette.green} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },

  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },

  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center' },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { flex: 1, width: 2, backgroundColor: Palette.hairline, marginVertical: 4 },
  stepBody: { flex: 1, paddingBottom: 22, paddingTop: 2 },
  stepNum: { ...Type.label, textTransform: 'uppercase' },
  stepText: { fontSize: 16, lineHeight: 23, color: Palette.ink, marginTop: 2 },

  faqCard: { paddingVertical: 4 },
  faqBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.hairline },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  faqQ: { flex: 1, fontSize: 15, fontWeight: '600', color: Palette.ink },
  faqA: { ...Type.body, paddingBottom: 14 },

  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  linkText: { fontSize: 14, fontWeight: '600', color: Palette.green },
});
