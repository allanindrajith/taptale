import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Sheet, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';

import { AppleButton } from './apple-button';

interface ForgotPasswordSheetProps {
  visible: boolean;
  language: AppLanguage;
  canUseApple: boolean;
  onClose: () => void;
  onUseApple: () => void;
  onCreateAccount: () => void;
}

/**
 * Honest "forgot password" help. Accounts are stored only on this phone and there is no
 * server, so we cannot email a reset link. We only offer options that really work.
 */
export function ForgotPasswordSheet({
  visible,
  language,
  canUseApple,
  onClose,
  onUseApple,
  onCreateAccount,
}: ForgotPasswordSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tr(language, 'Forgot password?', 'Pamiršote slaptažodį?')}>
      <View style={styles.note}>
        <Ionicons name="phone-portrait-outline" size={20} color={Palette.green} />
        <Text style={styles.noteText}>
          {tr(
            language,
            'Your TapTale account is saved only on this phone. There’s no server, so we can’t send you a reset email.',
            'Jūsų TapTale paskyra saugoma tik šiame telefone. Serverio nėra, todėl negalime atsiųsti slaptažodžio atkūrimo laiško.'
          )}
        </Text>
      </View>

      <Text style={Type.body}>
        {tr(language, 'You can still get going:', 'Vis tiek galite tęsti:')}
      </Text>

      {canUseApple ? (
        <AppleButton onPress={onUseApple} />
      ) : null}

      <Button
        label={tr(language, 'Create a new account', 'Sukurti naują paskyrą')}
        icon="person-add-outline"
        variant="secondary"
        onPress={onCreateAccount}
      />

      <Text style={styles.footnote}>
        {tr(
          language,
          'A new account starts with a fresh passport. Use a different email than the one you forgot.',
          'Nauja paskyra pradedama su nauju pasu. Naudokite kitą el. paštą nei pamirštos paskyros.'
        )}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: Palette.greenTint,
    borderRadius: 16,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 15, lineHeight: 22, color: Palette.ink },
  footnote: { ...Type.small, lineHeight: 19 },
});
