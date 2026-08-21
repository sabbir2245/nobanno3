import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ProductType } from '@/services/api';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';

interface Props {
  token: string | null;
  selectedId: number | null;
  onSelect: (type: ProductType | null) => void;
}

export function ProductTypePicker({ token, selectedId, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getProductTypes(token);
        setTypes(data);
      } catch {
        setTypes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, token]);

  const filtered = types.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name_bn.includes(q) || t.name_en.toLowerCase().includes(q);
  });

  const selected = types.find((t) => t.id === selectedId);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Ionicons name="apps" size={20} color={colors.darkGreen} />
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected ? selected.name_bn : 'পণ্যের ধরন নির্বাচন করুন'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>পণ্যের ধরন</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="খুঁজুন..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={colors.darkGreen} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      item.id === selectedId && styles.itemActive,
                    ]}
                    onPress={() => {
                      onSelect(item);
                      setVisible(false);
                      setSearch('');
                    }}
                  >
                    <Text style={styles.itemText}>{item.name_bn}</Text>
                    <Text style={styles.itemSub}>{item.name_en}</Text>
                    {item.id === selectedId && (
                      <Ionicons name="checkmark" size={20} color={colors.darkGreen} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>কোনো ধরন পাওয়া যায়নি</Text>
                }
              />
            )}

            {selectedId && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  onSelect(null);
                  setVisible(false);
                }}
              >
                <Text style={styles.clearText}>মুছে ফেলুন</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
  },
  placeholder: {
    color: Colors.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: Colors.textDark,
  },
  searchInput: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  itemActive: {
    backgroundColor: Colors.paleGreen,
  },
  itemText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.textDark,
  },
  itemSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    fontSize: 14,
  },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
