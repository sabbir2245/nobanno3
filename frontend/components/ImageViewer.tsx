import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setZoomed(false);
      setTimeout(() => scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false }), 50);
    }
  }, [visible, initialIndex]);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(images.length - 1, i));
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const toggleZoom = () => setZoomed((z) => !z);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (idx !== index && idx >= 0 && idx < images.length) setIndex(idx);
          }}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {images.map((uri, i) => (
            <View key={i} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity activeOpacity={1} onPress={toggleZoom} onLongPress={onClose} delayLongPress={300}>
                <Image
                  source={{ uri }}
                  style={zoomed ? styles.imageZoomed : styles.image}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <>
            {index > 0 && (
              <TouchableOpacity style={[styles.arrow, styles.arrowLeft]} onPress={() => goTo(index - 1)}>
                <Ionicons name="chevron-back" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
            {index < images.length - 1 && (
              <TouchableOpacity style={[styles.arrow, styles.arrowRight]} onPress={() => goTo(index + 1)}>
                <Ionicons name="chevron-forward" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {index + 1} / {images.length}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={[styles.hint, { paddingBottom: insets.bottom + 16 }]}>
          <Ionicons name="scan-outline" size={13} color="rgba(255,255,255,0.6)" />
          <Text style={styles.hintText}>Tap to zoom · Hold to close</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  image: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.72,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  imageZoomed: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  counterText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.white },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: Spacing.md },
  arrowRight: { right: Spacing.md },
  hint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hintText: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
});