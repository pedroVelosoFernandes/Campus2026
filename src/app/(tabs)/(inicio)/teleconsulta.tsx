import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MEU_SUS_DIGITAL_URL } from '@/components/teleconsulta/links';
import { TeleconsultaIllustration } from '@/components/teleconsulta/TeleconsultaIllustration';
import { colors, screenPadding, spacing, typography } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

async function openSusOptions() {
  try {
    await WebBrowser.openBrowserAsync(MEU_SUS_DIGITAL_URL, { controlsColor: colors.primary });
  } catch {
    await Linking.openURL(MEU_SUS_DIGITAL_URL).catch(() => {});
  }
}

const openAssistant = () => router.push('/assistente');

export default function TeleconsultaScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Teleconsulta" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration}>
          <TeleconsultaIllustration />
        </View>

        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">
            Continue no canal do SUS
          </Text>
          <Text style={styles.body}>Consulte os serviços digitais disponíveis na sua região.</Text>
        </View>

        <InfoNote message="Você será direcionado para um serviço externo." style={styles.note} />

        <View style={styles.actions}>
          <Button
            label="Consultar opções no SUS"
            icon={ExternalLink}
            onPress={openSusOptions}
            accessibilityHint="Abre o Meu SUS Digital no navegador"
          />
          <Button label="Voltar ao assistente" variant="outline" onPress={openAssistant} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxl },
  illustration: { marginHorizontal: -spacing.sm, marginTop: spacing.sm },
  intro: { marginTop: spacing.xl, gap: spacing.sm },
  title: { ...typography.title, color: colors.textHeading },
  body: { ...typography.bodyLarge, fontSize: 18, lineHeight: 25, color: colors.textBody },
  note: { marginTop: spacing.xxl },
  actions: { gap: spacing.md, marginTop: spacing.xxl },
});
