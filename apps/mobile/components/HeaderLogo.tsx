import { Image, StyleSheet, View } from 'react-native';
import { t } from '@/lib/i18n';

/** Half of the previous header logo size (was scale 4 → now scale 2). */
const LOGO_HEIGHT = 36;
const LOGO_WIDTH = 112;

type HeaderLogoProps = {
  compact?: boolean;
};

export function HeaderLogo({ compact = true }: HeaderLogoProps) {
  const height = compact ? LOGO_HEIGHT : LOGO_HEIGHT + 8;
  const width = compact ? LOGO_WIDTH : LOGO_WIDTH + 24;

  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/logo.png')}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel={t('app.name')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
