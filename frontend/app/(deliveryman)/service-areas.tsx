import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Area } from '@/services/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function ServiceAreasScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [areaList, current] = await Promise.all([
        api.getAreas(),
        api.getServiceAreas(token),
      ]);
      setAreas(areaList);
      setSelected(current.service_areas || []);
    } catch {
      Alert.alert('Error', 'Could not load service areas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.setServiceAreas(token, selected);
      Alert.alert('Saved', 'Service areas updated. Available batches will be filtered to these areas.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save service areas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.darkGreen} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Areas</Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={styles.hint}>
        Choose the areas (unions) you want to deliver for. Only their available batches will show on your dashboard.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.darkGreen} style={{ marginTop: 60 }} />
      ) : areas.length === 0 ? (
        <Text style={styles.empty}>No service areas configured yet.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {areas.map((area) => {
            const active = selected.includes(area.id);
            return (
              <TouchableOpacity
                key={area.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => toggle(area.id)}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, active && styles.rowNameActive]}>
                    {area.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {area.upazilas.length} upazila(s) · threshold {area.threshold_kg} kg
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={active ? Colors.darkGreen : Colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          title="Save Service Areas"
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  backBtn: { width: 40 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen },
  hint: {
    fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted,
    padding: Spacing.md, lineHeight: 20,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  rowActive: { borderColor: Colors.darkGreen, backgroundColor: '#E8F5E9' },
  rowText: { flex: 1, marginRight: Spacing.sm },
  rowName: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark },
  rowNameActive: { color: Colors.darkGreen },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: {
    fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', marginTop: 60,
  },
  footer: { padding: Spacing.md, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
});