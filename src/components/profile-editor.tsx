/**
 * Passport profile: avatar (photo or emoji fallback) + bottom-sheet editor
 * for the display name and profile photo.
 */
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { Button, IconName, Sheet, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { AVATAR_PRESETS, UserProfile, UserService } from '@/services/user-storage';

/* ------------------------------------------------------------------ */
/* Name validation                                                     */
/* ------------------------------------------------------------------ */

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 40;
// Letters (any script, incl. ąčęėįšųūž), combining marks, spaces, hyphens,
// straight and typographic apostrophes (iOS smart punctuation inserts ’).
const NAME_PATTERN = /^[\p{L}\p{M}'’ -]+$/u;
const NAME_INPUT_HARD_LIMIT = 60;

type NameError = 'required' | 'tooShort' | 'tooLong' | 'invalidChars';

export function validateName(raw: string): NameError | null {
  const name = raw.trim();
  if (name.length === 0) return 'required';
  if (name.length < NAME_MIN_LENGTH) return 'tooShort';
  if (name.length > NAME_MAX_LENGTH) return 'tooLong';
  if (!NAME_PATTERN.test(name)) return 'invalidChars';
  return null;
}

function nameErrorText(lang: AppLanguage, error: NameError): string {
  switch (error) {
    case 'required':
      return tr(lang, 'Please enter your name.', 'Įveskite savo vardą.');
    case 'tooShort':
      return tr(lang, 'Name needs at least 2 characters.', 'Vardas turi būti bent 2 simbolių.');
    case 'tooLong':
      return tr(lang, 'Name can be at most 40 characters.', 'Vardas gali būti ne ilgesnis nei 40 simbolių.');
    case 'invalidChars':
      return tr(
        lang,
        'Use letters, spaces, hyphens or apostrophes only.',
        'Naudokite tik raides, tarpus, brūkšnelius ar apostrofus.'
      );
  }
}

/* ------------------------------------------------------------------ */
/* Photo picking + storage                                             */
/* ------------------------------------------------------------------ */

type PhotoSource = 'camera' | 'library';

type PickOutcome =
  | { kind: 'picked'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'failed' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

async function pickPhoto(source: PhotoSource): Promise<PickOutcome> {
  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    return asset ? { kind: 'picked', uri: asset.uri } : { kind: 'cancelled' };
  } catch (error) {
    if (__DEV__) console.warn('[profile] photo pick failed', error);
    return { kind: 'failed' };
  }
}

const PHOTO_DIR_NAME = 'profile-photo';

/**
 * The picker returns a file in the app cache, which iOS/Android may purge.
 * Copy it into the document directory (unique name so image caches never show
 * a stale photo). Falls back to the original URI if copying is not possible.
 */
async function storePhoto(uri: string): Promise<string> {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) return uri;
  try {
    const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
    dir.create({ intermediates: true, idempotent: true });
    const extension = new File(uri).extension || '.jpg';
    const target = new File(dir, `avatar-${Date.now()}${extension}`);
    await new File(uri).copy(target);
    return target.uri;
  } catch (error) {
    if (__DEV__) console.warn('[profile] could not copy photo to documents', error);
    return uri;
  }
}

/** Delete stored profile photos other than the one currently in use. */
function prunePhotos(keepUri: string | null) {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
    if (!dir.exists) return;
    dir
      .list()
      .filter((entry) => entry instanceof File && entry.uri !== keepUri)
      .forEach((entry) => entry.delete());
  } catch (error) {
    if (__DEV__) console.warn('[profile] could not clean old photos', error);
  }
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

interface ProfileAvatarProps {
  uri?: string | null;
  avatarId: string;
  size: number;
}

export function ProfileAvatar({ uri, avatarId, size }: ProfileAvatarProps) {
  const preset = AVATAR_PRESETS.find((a) => a.id === avatarId) ?? AVATAR_PRESETS[0];
  const shape = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatar, shape, { backgroundColor: preset.bgHex }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={200} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{preset.emoji}</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Editor sheet                                                        */
/* ------------------------------------------------------------------ */

interface ProfileEditorProps {
  visible: boolean;
  language: AppLanguage;
  /** Values the draft starts from. Remount (via `key`) to start a fresh edit session. */
  profile: UserProfile;
  onCancel: () => void;
  onSaved: () => void;
}

interface PhotoNotice {
  message: string;
  canOpenSettings: boolean;
}

export function ProfileEditor({ visible, language, profile, onCancel, onSaved }: ProfileEditorProps) {
  const { height } = useWindowDimensions();
  const [name, setName] = useState(profile.name ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile.avatarUri ?? null);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<PhotoNotice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nameError = validateName(name);
  const showNameError = isNameTouched && nameError !== null;

  const choosePhoto = async (source: PhotoSource) => {
    setPhotoNotice(null);
    const outcome = await pickPhoto(source);
    if (outcome.kind === 'picked') {
      setPhotoUri(outcome.uri);
      setIsPhotoMenuOpen(false);
    } else if (outcome.kind === 'denied') {
      setPhotoNotice({
        message:
          source === 'camera'
            ? tr(
                language,
                'TapTale needs camera access to take a profile photo. You can allow it in Settings.',
                'TapTale reikia prieigos prie kameros, kad galėtumėte nusifotografuoti. Ją galite leisti nustatymuose.'
              )
            : tr(
                language,
                'TapTale needs access to your photos to choose a profile photo. You can allow it in Settings.',
                'TapTale reikia prieigos prie nuotraukų, kad galėtumėte pasirinkti profilio nuotrauką. Ją galite leisti nustatymuose.'
              ),
        canOpenSettings: !outcome.canAskAgain,
      });
    } else if (outcome.kind === 'failed') {
      setPhotoNotice({
        message: tr(
          language,
          "Couldn't open the photo picker. Please try again.",
          'Nepavyko atidaryti nuotraukų. Bandykite dar kartą.'
        ),
        canOpenSettings: false,
      });
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoNotice(null);
    setIsPhotoMenuOpen(false);
  };

  const chooseIcon = (id: string) => {
    setAvatarId(id);
    setPhotoUri(null);
    setIsPhotoMenuOpen(false);
  };

  const save = async () => {
    if (nameError !== null || isSaving) return;
    setIsSaving(true);
    const isNewPhoto = photoUri !== null && photoUri !== profile.avatarUri;
    const finalUri = isNewPhoto ? await storePhoto(photoUri) : photoUri;
    UserService.updateProfile({ name, avatarUri: finalUri, avatarId });
    prunePhotos(finalUri);
    setIsSaving(false);
    onSaved();
  };

  return (
    <Sheet visible={visible} onClose={onCancel} title={tr(language, 'Edit profile', 'Redaguoti profilį')}>
      <ScrollView
        style={{ maxHeight: height * 0.72 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={styles.photoBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(language, 'Change profile photo', 'Keisti profilio nuotrauką')}
            accessibilityState={{ expanded: isPhotoMenuOpen }}
            onPress={() => setIsPhotoMenuOpen((open) => !open)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ProfileAvatar uri={photoUri} avatarId={avatarId} size={104} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text style={styles.photoHint}>{tr(language, 'Tap to change photo', 'Bakstelėkite, kad pakeistumėte')}</Text>
        </View>

        {isPhotoMenuOpen ? (
          <View style={styles.menu}>
            <MenuRow
              icon="camera-outline"
              label={tr(language, 'Take photo', 'Fotografuoti')}
              onPress={() => choosePhoto('camera')}
            />
            <View style={styles.divider} />
            <MenuRow
              icon="images-outline"
              label={tr(language, 'Choose from library', 'Pasirinkti iš galerijos')}
              onPress={() => choosePhoto('library')}
            />
            {photoUri ? (
              <>
                <View style={styles.divider} />
                <MenuRow
                  icon="trash-outline"
                  label={tr(language, 'Remove photo', 'Pašalinti nuotrauką')}
                  onPress={removePhoto}
                  isDanger
                />
              </>
            ) : null}
            <Text style={styles.iconsLabel}>{tr(language, 'Or use an icon', 'Arba naudokite ženkliuką')}</Text>
            <View style={styles.iconGrid}>
              {AVATAR_PRESETS.map((a) => {
                const isSelected = !photoUri && a.id === avatarId;
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => chooseIcon(a.id)}
                    style={[styles.iconOption, { backgroundColor: a.bgHex }, isSelected && styles.iconOptionOn]}>
                    <Text style={styles.iconEmoji}>{a.emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {photoNotice ? (
          <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.noticeText}>{photoNotice.message}</Text>
            {photoNotice.canOpenSettings ? (
              <Button
                variant="ghost"
                label={tr(language, 'Open Settings', 'Atidaryti nustatymus')}
                onPress={() => Linking.openSettings()}
              />
            ) : null}
          </View>
        ) : null}

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel} nativeID="profile-name-label">
            {tr(language, 'Name', 'Vardas')}
          </Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setIsNameTouched(true);
            }}
            onBlur={() => setIsNameTouched(true)}
            placeholder={tr(language, 'Your name', 'Jūsų vardas')}
            placeholderTextColor={Palette.mute}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            autoCorrect={false}
            maxLength={NAME_INPUT_HARD_LIMIT}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel={tr(language, 'Name', 'Vardas')}
            accessibilityLabelledBy="profile-name-label"
            accessibilityHint={showNameError && nameError ? nameErrorText(language, nameError) : undefined}
            style={[styles.input, showNameError && styles.inputError]}
          />
          {showNameError && nameError ? (
            <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {nameErrorText(language, nameError)}
            </Text>
          ) : (
            <Text style={styles.helpText}>
              {tr(language, '2–40 letters. Shown on your passport.', '2–40 raidžių. Rodoma jūsų pase.')}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            label={tr(language, 'Cancel', 'Atšaukti')}
            onPress={onCancel}
            disabled={isSaving}
            style={styles.flex}
          />
          <Button
            label={tr(language, 'Save', 'Išsaugoti')}
            onPress={save}
            disabled={nameError !== null}
            loading={isSaving}
            style={styles.flex}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}

interface MenuRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  isDanger?: boolean;
}

function MenuRow({ icon, label, onPress, isDanger }: MenuRowProps) {
  const color = isDanger ? Palette.danger : Palette.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  pressed: { opacity: 0.7 },
  body: { gap: 18, paddingBottom: 4 },

  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  photoBlock: { alignItems: 'center', gap: 8 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.green,
    borderWidth: 3,
    borderColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: { ...Type.small, textAlign: 'center' },

  menu: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  menuLabel: { flex: 1, fontSize: 17, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.hairline, marginLeft: 34 },
  iconsLabel: { ...Type.small, marginTop: 10, marginBottom: 10 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  iconOption: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconOptionOn: { borderWidth: 3, borderColor: Palette.green },
  iconEmoji: { fontSize: 24 },

  notice: { backgroundColor: Palette.dangerTint, borderRadius: 14, padding: 14, gap: 4 },
  noticeText: { fontSize: 15, lineHeight: 21, color: Palette.ink },

  field: { gap: 8 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: Palette.inkSoft },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    backgroundColor: Palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    color: Palette.ink,
  },
  inputError: { borderColor: Palette.danger },
  errorText: { fontSize: 14, fontWeight: '600', color: Palette.danger },
  helpText: { fontSize: 14, color: Palette.mute },

  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
});
