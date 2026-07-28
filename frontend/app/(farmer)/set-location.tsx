import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAllDivision, getDistricts, getUpazilas, getUnions } from 'bd-divisions-to-unions';

interface GeoItem {
  id: string;
  name: string;
  bn_name: string;
}

export default function SetLocationScreen() {
  const router = useRouter();
  const { user, token, refreshProfile } = useAuth();
  const [divisions] = useState<GeoItem[]>(() => getAllDivision('en') as GeoItem[]);
  const [selectedDivision, setSelectedDivision] = useState<GeoItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<GeoItem | null>(null);
  const [selectedUpazila, setSelectedUpazila] = useState<GeoItem | null>(null);
  const [selectedUnion, setSelectedUnion] = useState<GeoItem | null>(null);
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [upazilas, setUpazilas] = useState<GeoItem[]>([]);
  const [unions, setUnions] = useState<GeoItem[]>([]);
  const [step, setStep] = useState<'division' | 'district' | 'upazila' | 'union'>('division');
  const [saving, setSaving] = useState(false);

  const selectDivision = (d: GeoItem) => {
    setSelectedDivision(d);
    setSelectedDistrict(null);
    setSelectedUpazila(null);
    setSelectedUnion(null);
    setDistricts(getDistricts(d.id, 'en') as GeoItem[]);
    setUpazilas([]);
    setUnions([]);
    setStep('district');
  };

  const selectDistrict = (d: GeoItem) => {
    setSelectedDistrict(d);
    setSelectedUpazila(null);
    setSelectedUnion(null);
    setUpazilas(getUpazilas(d.id, 'en') as GeoItem[]);
    setUnions([]);
    setStep('upazila');
  };

  const selectUpazila = (d: GeoItem) => {
    setSelectedUpazila(d);
    setSelectedUnion(null);
    setUnions(getUnions(d.id, 'en') as GeoItem[]);
    setStep('union');
  };

  const selectUnion = (d: GeoItem) => {
    setSelectedUnion(d);
  };

  const handleSave = async () => {
    if (!token || !selectedDivision || !selectedDistrict || !selectedUpazila) {
      Alert.alert('Error', 'Please select at least Division, District, and Upazila.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        division: selectedDivision.name,
        district: selectedDistrict.name,
        upazila: selectedUpazila.name,
        union: selectedUnion?.name || '',
      };
      const response = await fetch(`http://10.159.4.13:8000/api/profile/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to save');
      await refreshProfile();
      Alert.alert('Saved', 'Your location has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const selectionLabel = () => {
    const parts = [
      selectedDivision?.name,
      selectedDistrict?.name,
      selectedUpazila?.name,
      selectedUnion?.name,
    ].filter(Boolean);
    return parts.join(' → ') || 'No location selected';
  };

  const renderList = (items: GeoItem[], onSelect: (item: GeoItem) => void) => (
    <ScrollView style={styles.list}>
      {items.map((item) => {
        const isSelected =
          (step === 'division' && selectedDivision?.id === item.id) ||
          (step === 'district' && selectedDistrict?.id === item.id) ||
          (step === 'upazila' && selectedUpazila?.id === item.id) ||
          (step === 'union' && selectedUnion?.id === item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.listItem, isSelected && styles.listItemSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
              {item.name}
            </Text>
            {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.darkGreen} />}
            {step !== 'union' && !isSelected && (
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.darkGreen} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Location</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        {(['division', 'district', 'upazila', 'union'] as const).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />}
            <TouchableOpacity
              onPress={() => setStep(s)}
              style={[styles.breadcrumbItem, step === s && styles.breadcrumbItemActive]}
            >
              <Text style={[styles.breadcrumbText, step === s && styles.breadcrumbTextActive]}>
                {s === 'division' ? 'Division' : s === 'district' ? 'District' : s === 'upazila' ? 'Upazila' : 'Union'}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Selection preview */}
      <View style={styles.preview}>
        <Ionicons name="location" size={16} color={Colors.darkGreen} />
        <Text style={styles.previewText}>{selectionLabel()}</Text>
      </View>

      {/* List */}
      {step === 'division' && renderList(divisions, selectDivision)}
      {step === 'district' && renderList(districts, selectDistrict)}
      {step === 'upazila' && renderList(upazilas, selectUpazila)}
      {step === 'union' && renderList(unions, selectUnion)}

      {/* Save button */}
      {selectedUpazila && (
        <View style={styles.footer}>
          <PrimaryButton
            title={saving ? 'Saving...' : 'Save Location'}
            onPress={handleSave}
            loading={saving}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backBtn: { width: 40 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, backgroundColor: Colors.cream, gap: 4,
  },
  breadcrumbItem: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  breadcrumbItemActive: { backgroundColor: Colors.darkGreen },
  breadcrumbText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted },
  breadcrumbTextActive: { color: Colors.white },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  previewText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, flex: 1 },
  list: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  listItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  listItemSelected: { borderColor: Colors.darkGreen, backgroundColor: '#E8F5E9' },
  listItemText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textDark, flex: 1 },
  listItemTextSelected: { fontFamily: Fonts.semiBold, color: Colors.darkGreen },
  footer: {
    padding: Spacing.md, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
});