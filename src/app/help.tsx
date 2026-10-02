import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLanguage, resolveText } from '@/constants/spots';
import { Spacing, WiseColors } from '@/constants/theme';
import { UnlockService } from '@/services/unlock-storage';
import { NfcService } from '@/services/nfc-service';

interface StepItem {
  number: string;
  icon: string;
  titleEn: string;
  titleLt: string;
  descEn: string;
  descLt: string;
  tipEn: string;
  tipLt: string;
}

const STEPS: StepItem[] = [
  {
    number: '01',
    icon: '🧭',
    titleEn: 'Discover Heritage Landmarks',
    titleLt: 'Suraskite Istorines Vietas',
    descEn: 'Open the Home or Search tab to see curated cultural landmarks around you, complete with real-time walking, cycling, and driving estimates.',
    descLt: 'Atidarykite „Pradžia“ arba „Paieška“ skiltį ir pamatysite kultūros paveldo vietas su ėjimo pėsčiomis, dviračiu ir automobiliu trukmėmis.',
    tipEn: 'Tip: Tap „Get Directions“ on any spot to navigate using native maps.',
    tipLt: 'Patarimas: Paspauskite „Get Directions“, kad pradėtumėte navigaciją.',
  },
  {
    number: '02',
    icon: '🏛️',
    titleEn: 'Locate the Physical NFC Plaque',
    titleLt: 'Suraskite Fizinę NFC Lentelę',
    descEn: 'When arriving at the monument, look for the official TapTale bronze plaque mounted near the main entrance, archway, or information board.',
    descLt: 'Atvykę prie paminklo ar pilies, ieškokite oficialios „TapTale“ bronzinės lentelės šalia pagrindinio įėjimo ar informacinio stendo.',
    tipEn: 'Tip: Each plaque features the TapTale wave logo and a backup passkey.',
    tipLt: 'Patarimas: Ant kiekvienos lentelės yra logotipas ir atsarginis kodas.',
  },
  {
    number: '03',
    icon: '📱',
    titleEn: 'Tap Your Phone to the Tag',
    titleLt: 'Prilieskite Telefoną prie Žymos',
    descEn: 'Hold the top back edge of your iPhone (or center back of Android) within 2-3 cm of the plaque emblem. No camera scanning needed!',
    descLt: 'Prilieskite „iPhone“ viršutinę nugarėlės dalį (arba „Android“ centrą) prie lentelės ženklo. Nereikia atidaryti kameros!',
    tipEn: 'iPhone Sensor: Located at the very top edge beside the camera lenses.',
    tipLt: '„iPhone“ jutiklis yra pačiame viršuje šalia kamerų.',
  },
  {
    number: '04',
    icon: '🔓',
    titleEn: 'Unlock 30-Day Heritage Pass',
    titleLt: '30 Dienų Prieigos Leidimas',
    descEn: 'Tapping instantly activates a 30-day (1 month) offline pass! You gain unlimited access to cinematic audio guides, secret lore chapters, and cultural music.',
    descLt: 'Prilietimas akimirksniu aktyvuoja 30 dienų (1 mėnesio) prieigos leidimą: audio gidą, slaptas istorijas ir tradicinę muziką.',
    tipEn: 'Pass Validity: Keeps content unlocked on your phone for a full month.',
    tipLt: 'Leidimas galioja visą mėnesį jūsų telefone.',
  },
  {
    number: '05',
    icon: '🔄',
    titleEn: 'Revisit & Renew to Extend',
    titleLt: 'Pakartotinis Apsilankymas',
    descEn: 'When your 30-day pass expires, the lore locks again until your next visit. Simply tap the physical plaque again on site to renew for another month!',
    descLt: 'Pasibaigus 30 dienų laikotarpiui, turinys vėl užsirakina. Norėdami pratęsti, tiesiog vėl apsilankykite vietoje ir prilieskite telefoną.',
    tipEn: 'Heritage Rule: Keeps exploration authentic and anchored to real places.',
    tipLt: 'Paveldo taisyklė: skatina tikrus apsilankymus istorinėse vietose.',
  },
  {
    number: '06',
    icon: '🏆',
    titleEn: 'Collect Badges in the Me Tab',
    titleLt: 'Kolekcionuokite Ženklelius „Me“',
    descEn: 'Every visit updates your personal Timeline. Visit multiple landmarks (like Gediminas Tower + Trakai Castle) to unlock prestigious badges like Grand Castle Master!',
    descLt: 'Kiekvienas vizitas papildo jūsų laiko juostą. Aplankykite pilis ir šventoves, kad gautumėte prestižinius ženklelius „Me“ skiltyje.',
    tipEn: 'Cloud Backup: Link Apple, Google, or Email in Me to never lose data.',
    tipLt: 'Sinchronizacija: Prijunkite Apple ar Google „Me“ skiltyje.',
  },
];

interface FAQItem {
  qEn: string;
  qLt: string;
  aEn: string;
  aLt: string;
}

const FAQS: FAQItem[] = [
  {
    qEn: 'Where is the NFC antenna on my iPhone?',
    qLt: 'Kur yra NFC antena mano „iPhone“ telefone?',
    aEn: 'On iPhones (iPhone XS / XR and newer), the NFC reader is located at the top rear edge, near the camera module. Simply rest the top edge flat against the plaque.',
    aLt: '„iPhone“ (XS / XR ir naujesniuose) NFC antena yra pačiame viršutiniame nugarėlės krašte šalia kamerų.',
  },
  {
    qEn: 'Do I need mobile internet data at the historical site?',
    qLt: 'Ar istorinėje vietoje būtinas interneto ryšys?',
    aEn: 'No! TapTale stores all stories, maps, and audio locally. Once unlocked via physical NFC, your 30-day pass works completely offline in forests and castle basements.',
    aLt: 'Ne! „TapTale“ saugo istorijas ir audio vietiškai. Atrakinus NFC žyma, turinys veikia pilnai be interneto.',
  },
  {
    qEn: 'What if my phone’s NFC is disabled or tag is damaged?',
    qLt: 'Ką daryti, jei NFC išjungtas arba žyma apgadinta?',
    aEn: 'Every physical plaque has an engraved 6-character backup code (e.g. VLN-GEDI-1323). Open the spot’s story page and tap „Enter Plaque Passcode“ to unlock!',
    aLt: 'Kiekviena lentelė turi išgraviruotą kodą (pvz., VLN-GEDI-1323). Atidarykite vietos langą ir suveskite kodą rankiniu būdu!',
  },
  {
    qEn: 'How do I save my passes if I switch phones?',
    qLt: 'Kaip išsaugoti leidimus pakeitus telefoną?',
    aEn: 'Go to the „Me“ tab and tap „Continue with Apple“, „Continue with Google“, or „Continue with Email“. Your 30-day passes and badges will sync to the cloud.',
    aLt: 'Eikite į „Me“ skiltį ir prisijunkite su Apple, Google ar el. paštu. Visi leidimai ir ženkleliai bus saugūs debesyje.',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const [language, setLanguage] = useState<AppLanguage>('en');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [simulatedTapped, setSimulatedTapped] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState<string | null>(null);

  async function handleTestNfcHardware() {
    setSimulatedTapped(true);
    const supported = await NfcService.isHardwareSupported();
    const enabled = supported ? await NfcService.isEnabled() : false;

    if (supported) {
      setSimulatorStatus(
        language === 'lt'
          ? `✅ NFC Aparatūra Aktyvi (${enabled ? 'Įjungta' : 'Išjungta nustatymuose'}). Priglauskite fizinę žymą!`
          : `✅ NFC Hardware Ready (${enabled ? 'Enabled' : 'Disabled in Settings'}). Ready to scan physical tags!`
      );
    } else {
      setSimulatorStatus(
        language === 'lt'
          ? 'ℹ️ Simuliatoriuje nėra fizinio NFC lusto. Naudokite tikrą iPhone/Android telefoną arba įveskite lentelės kodą.'
          : 'ℹ️ Physical NFC hardware not present in Simulator. Test on a physical iPhone/Android with NFC, or enter the plaque passkey.'
      );
    }

    setTimeout(() => {
      setSimulatedTapped(false);
    }, 2500);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>
              {language === 'lt' ? 'Pagalba ir Gidas' : 'How It Works'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {language === 'lt'
                ? 'Kaip naudotis NFC žymomis ir atrakinti istorijas'
                : 'Guide to physical NFC tags, 30-day passes & badges'}
            </Text>
          </View>

          {/* Language Toggle */}
          <Pressable
            style={styles.langToggle}
            onPress={() => setLanguage(language === 'en' ? 'lt' : 'en')}>
            <Text style={styles.langToggleText}>
              {language === 'en' ? '🇬🇧 EN' : '🇱🇹 LT'}
            </Text>
          </Pressable>
        </View>

        {/* Hero Interactive Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>📡 NFC TECHNOLOGY</Text>
            </View>
            <Text style={styles.heroVersion}>TapTale Guide v2.4</Text>
          </View>

          <Text style={styles.heroTitle}>
            {language === 'lt'
              ? 'Fizinės žymos. Tikros vietos. 30 dienų istorijos.'
              : 'Physical Plaques. Real Places. 30-Day Lore Passes.'}
          </Text>
          <Text style={styles.heroDesc}>
            {language === 'lt'
              ? '„TapTale“ sujungia istorinį Lietuvos paveldą su fizinėmis NFC lentelėmis. Norėdami išgirsti vietos audio gidą ir slaptas legendas, turite aplankyti tikrąją vietovę.'
              : 'TapTale connects real Lithuanian monuments to your phone via NFC plaques. Audio narration, secret legends, and music unlock only when you physically visit.'}
          </Text>

          {/* Phone Position Diagram */}
          <View style={styles.diagramBox}>
            <View style={styles.diagramCol}>
              <Text style={styles.diagramIcon}>🍏</Text>
              <Text style={styles.diagramLabel}>iPhone</Text>
              <Text style={styles.diagramSub}>Top rear edge</Text>
            </View>
            <View style={styles.diagramDivider} />
            <View style={styles.diagramCol}>
              <Text style={styles.diagramIcon}>🤖</Text>
              <Text style={styles.diagramLabel}>Android</Text>
              <Text style={styles.diagramSub}>Center rear</Text>
            </View>
            <View style={styles.diagramDivider} />
            <View style={styles.diagramCol}>
              <Text style={styles.diagramIcon}>⏱️</Text>
              <Text style={styles.diagramLabel}>30 Days</Text>
              <Text style={styles.diagramSub}>Pass duration</Text>
            </View>
          </View>
        </View>

        {/* PHYSICAL NFC HARDWARE DIAGNOSTICS */}
        <View style={styles.sandboxCard}>
          <Text style={styles.sandboxTitle}>
            {language === 'lt' ? '📡 Fizinio NFC Diagnostika' : '📡 Physical NFC Hardware Diagnostics'}
          </Text>
          <Text style={styles.sandboxDesc}>
            {language === 'lt'
              ? 'Paspauskite žemiau, kad patikrintumėte, ar jūsų įrenginys palaiko CoreNFC/NFC aparatūrą fizinėms lentelėms nuskaityti.'
              : 'Press below to verify whether your device supports CoreNFC/NFC hardware for scanning physical heritage tags.'}
          </Text>

          <Pressable
            style={[
              styles.plaqueMedallion,
              simulatedTapped && styles.plaqueMedallionTapped,
            ]}
            onPress={handleTestNfcHardware}>
            <Text style={styles.plaqueEmoji}>
              {simulatedTapped ? '🔍' : '📡'}
            </Text>
            <Text style={styles.plaqueButtonText}>
              {simulatedTapped
                ? language === 'lt'
                  ? 'Tikrinama NFC Aparatūra…'
                  : 'Testing NFC Hardware…'
                : language === 'lt'
                ? 'Patikrinti NFC Būseną'
                : 'Check NFC Reader Status'}
            </Text>
          </Pressable>

          {simulatorStatus && (
            <View style={styles.simStatusPill}>
              <Text style={styles.simStatusText}>{simulatorStatus}</Text>
            </View>
          )}
        </View>

        {/* STEP BY STEP GUIDE */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {language === 'lt' ? 'Žingsnis po Žingsnio' : 'Step-by-Step Walkthrough'}
          </Text>
        </View>

        <View style={styles.stepsList}>
          {STEPS.map((step, idx) => (
            <View key={step.number} style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepIconWrap}>
                  <Text style={styles.stepEmoji}>{step.icon}</Text>
                </View>

                <View style={styles.stepTitleCol}>
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>STEP {step.number}</Text>
                  </View>
                  <Text style={styles.stepTitle}>
                    {language === 'lt' ? step.titleLt : step.titleEn}
                  </Text>
                </View>
              </View>

              <Text style={styles.stepDesc}>
                {language === 'lt' ? step.descLt : step.descEn}
              </Text>

              <View style={styles.stepTipBox}>
                <Text style={styles.stepTipText}>
                  💡 {language === 'lt' ? step.tipLt : step.tipEn}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            {language === 'lt' ? 'Dažniausiai Užduodami Klausimai' : 'Frequently Asked Questions'}
          </Text>
        </View>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaqIndex === index;
            return (
              <Pressable
                key={index}
                style={styles.faqCard}
                onPress={() => setExpandedFaqIndex(isExpanded ? null : index)}>
                <View style={styles.faqQuestionRow}>
                  <Text style={styles.faqQuestion}>
                    {language === 'lt' ? faq.qLt : faq.qEn}
                  </Text>
                  <Text style={styles.faqArrow}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {isExpanded && (
                  <View style={styles.faqAnswerBox}>
                    <Text style={styles.faqAnswer}>
                      {language === 'lt' ? faq.aLt : faq.aEn}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* SUPPORT / CONTACT CARD */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>
            {language === 'lt' ? 'Reikia Papildomos Pagalbos?' : 'Need More Assistance?'}
          </Text>
          <Text style={styles.supportDesc}>
            {language === 'lt'
              ? 'Jei radote pažeistą NFC lentelę arba turite klausimų apie paveldo maršrutus, susisiekite su „TapTale“ komanda.'
              : 'If you encounter a missing plaque or need technical assistance with your passes, our heritage team is here to help.'}
          </Text>

          <Pressable
            style={styles.supportBtn}
            onPress={() => Linking.openURL('https://github.com/allanindrajith/TapTale')}>
            <Text style={styles.supportBtnText}>
              {language === 'lt' ? 'Atidaryti TapTale Repozitoriją' : 'Open TapTale Project'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: WiseColors.body,
    marginTop: 2,
  },
  langToggle: {
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  heroCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginBottom: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroPill: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  heroVersion: {
    fontSize: 11,
    color: WiseColors.mute,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    lineHeight: 24,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
    marginBottom: 14,
  },
  diagramBox: {
    flexDirection: 'row',
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  diagramCol: {
    flex: 1,
    alignItems: 'center',
  },
  diagramIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  diagramLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  diagramSub: {
    fontSize: 10,
    color: WiseColors.mute,
    marginTop: 1,
  },
  diagramDivider: {
    width: 1,
    backgroundColor: WiseColors.forestBorder,
    marginVertical: 4,
  },
  sandboxCard: {
    backgroundColor: WiseColors.primaryPale,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginBottom: 20,
    alignItems: 'center',
  },
  sandboxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.primary,
    marginBottom: 4,
  },
  sandboxDesc: {
    fontSize: 12,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  plaqueMedallion: {
    backgroundColor: WiseColors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  plaqueMedallionTapped: {
    backgroundColor: '#123d24',
  },
  plaqueEmoji: {
    fontSize: 20,
  },
  plaqueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  simStatusPill: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WiseColors.primary,
  },
  simStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.primary,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  stepsList: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WiseColors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 24,
  },
  stepTitleCol: {
    flex: 1,
  },
  stepNumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  stepNumText: {
    fontSize: 9,
    fontWeight: '900',
    color: WiseColors.primary,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  stepDesc: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
    marginBottom: 10,
  },
  stepTipBox: {
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  stepTipText: {
    fontSize: 11,
    color: WiseColors.ink,
    fontWeight: '600',
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    flex: 1,
    paddingRight: 10,
  },
  faqArrow: {
    fontSize: 11,
    color: WiseColors.mute,
  },
  faqAnswerBox: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginTop: 20,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 6,
  },
  supportDesc: {
    fontSize: 13,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  supportBtn: {
    backgroundColor: WiseColors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  supportBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
