import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import SelectionChip from '../components/SelectionChip';
import {
  useLanguages,
  useUpdateLanguagePreferences,
} from '../api/language';
import { useAuthStore } from '../store/authStore';
import { log } from '../utils/analytics';

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, preferredLanguages, setPreferredLanguages } = useAuthStore();
  const { data: languages = [], isLoading } = useLanguages();
  const { mutateAsync: savePreferences } = useUpdateLanguagePreferences();

  // Seeded from the store so reaching this from Settings edits the existing
  // picks instead of starting blank.
  const [selected, setSelected] = useState<string[]>(preferredLanguages ?? []);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = navigation.canGoBack();

  const toggle = (code: string) =>
    setSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );

  const leave = () =>
    isEditing
      ? navigation.goBack()
      : (navigation as any).reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  // Fail-soft: a failed save must not trap anyone in onboarding. They keep the
  // unfiltered catalogue and get asked again next launch.
  const finish = async (codes: string[]) => {
    if (submitting) return;
    setSubmitting(true);

    await setPreferredLanguages(codes);

    if (token) {
      try {
        await savePreferences(codes);
        log.info('Language preferences saved', { count: codes.length });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Could not save your languages',
          text2: 'You can set them later in Settings.',
        });
      }
    }

    setSubmitting(false);
    leave();
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 13 }]}>
        <Image
          source={require('../images/MainLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity
          onPress={() => (isEditing ? leave() : finish([]))}
          disabled={submitting}
        >
          <Text style={styles.skip}>{isEditing ? 'Cancel' : 'Skip for now'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>
          What should we{'\n'}
          <Text style={styles.titleBold}>play for you?</Text>
        </Text>
        <Text style={styles.subtitle}>
          Pick the languages you watch in. Your home feed, recommendations and
          search will stick to these. Change them anytime in Settings.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#ff6a00" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.chips}
          showsVerticalScrollIndicator={false}
        >
          {languages.map(l => (
            <SelectionChip
              key={l.id}
              label={l.nativeLabel || l.label}
              subLabel={l.nativeLabel ? l.label : null}
              selected={selected.includes(l.code)}
              onPress={() => toggle(l.code)}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.count}>
          {selected.length
            ? `${selected.length} language${
                selected.length > 1 ? 's' : ''
              } selected`
            : 'Skip to see everything'}
        </Text>
        <TouchableOpacity
          style={[styles.cta, !selected.length && styles.ctaDisabled]}
          onPress={() => finish(selected)}
          disabled={submitting || !selected.length}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 70, height: 20 },
  skip: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  intro: { paddingHorizontal: 25, paddingTop: 28 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '300', color: '#fff' },
  titleBold: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
    maxWidth: '90%',
  },
  loader: { marginTop: 40 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 25,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footer: { paddingHorizontal: 25, paddingTop: 8 },
  count: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  cta: {
    backgroundColor: '#ff6a00',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.5)',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...Platform.select({
      ios: {
        shadowColor: '#ff6a00',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default OnboardingScreen;
