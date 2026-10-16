import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { FAQS } from '@/components/perfil/faq';
import { FaqItem } from '@/components/perfil/FaqItem';
import { SettingsGroup } from '@/components/perfil/SettingsGroup';
import { SubScreen } from '@/components/perfil/SubScreen';
import { spacing } from '@/theme';

export default function AjudaScreen() {
  // `?pergunta=<chave>` abre uma resposta direto (ex.: link vindo do assistente).
  const { pergunta } = useLocalSearchParams<{ pergunta?: string }>();
  const initial = FAQS.some((faq) => faq.key === pergunta) ? (pergunta ?? null) : null;
  const [openKey, setOpenKey] = useState<string | null>(initial);

  return (
    <SubScreen title="Ajuda" intro="Respostas rápidas sobre o app e sobre como usar o SUS.">
      <SettingsGroup title="Perguntas frequentes" dividerInset={spacing.lg}>
        {FAQS.map((faq) => (
          <FaqItem
            key={faq.key}
            question={faq.question}
            answer={faq.answer}
            expanded={openKey === faq.key}
            onToggle={() => setOpenKey((current) => (current === faq.key ? null : faq.key))}
            testID={`faq-${faq.key}`}
          />
        ))}
      </SettingsGroup>

      <View style={styles.actions}>
        <Button label="Falar com o assistente" icon={MessageCircle} onPress={() => router.push('/assistente')} />
        <Button
          label="Ligar para o Disque Saúde 136"
          icon={Phone}
          variant="outline"
          onPress={() => void Linking.openURL('tel:136').catch(() => {})}
        />
      </View>

      <InfoNote title="Em emergência" message="Ligue 192 (SAMU). Não espere a resposta do app." />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
});
