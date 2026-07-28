import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { api, BangladeshLocation } from '@/services/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LocationSelection {
  division: { id: number; name_en: string; name_bn: string } | null;
  district: { id: number; name_en: string; name_bn: string } | null;
  upazila: { id: number; name_en: string; name_bn: string } | null;
  union: { id: number; name_en: string; name_bn: string } | null;
  ward: { id: number; name_en: string; name_bn: string } | null;
}

interface Props {
  onLocationSelected: (location: LocationSelection) => void;
  initialLocation?: LocationSelection;
}

export default function CascadingLocationPicker({ onLocationSelected, initialLocation }: Props) {
  const [divisions, setDivisions] = useState<BangladeshLocation[]>([]);
  const [districts, setDistricts] = useState<BangladeshLocation[]>([]);
  const [upazilas, setUpazilas] = useState<BangladeshLocation[]>([]);
  const [unions, setUnions] = useState<BangladeshLocation[]>([]);
  const [wards, setWards] = useState<BangladeshLocation[]>([]);

  const [selection, setSelection] = useState<LocationSelection>(
    initialLocation || {
      division: null, district: null, upazila: null, union: null, ward: null,
    }
  );
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load divisions on mount
  useEffect(() => {
    console.log('[LOCATION PICKER] Loading divisions...');
    setLoadingLocations(true);
    api.getLocations('division')
      .then((data) => {
        console.log('[LOCATION PICKER] Divisions loaded:', data.length);
        setDivisions(data);
      })
      .catch((err) => console.log('[LOCATION PICKER] Error loading divisions:', err))
      .finally(() => setLoadingLocations(false));
  }, []);

  const loadChildren = async (parentId: number, level: string) => {
    console.log(`[LOCATION PICKER] Loading ${level} for parent ${parentId}`);
    setLoadingLocations(true);
    try {
      const data = await api.getLocations(level, parentId);
      console.log(`[LOCATION PICKER] ${level} loaded:`, data.length);
      switch (level) {
        case 'district': setDistricts(data); break;
        case 'upazila': setUpazilas(data); break;
        case 'union': setUnions(data); break;
        case 'ward': setWards(data); break;
      }
    } catch (err) {
      console.log(`[LOCATION PICKER] Error loading ${level}:`, err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSelect = (level: string, item: BangladeshLocation) => {
    console.log(`[LOCATION PICKER] Selected ${level}:`, item.name_en);

    const newSelection = { ...selection };

    switch (level) {
      case 'division':
        newSelection.division = { id: item.id, name_en: item.name_en, name_bn: item.name_bn };
        newSelection.district = null;
        newSelection.upazila = null;
        newSelection.union = null;
        newSelection.ward = null;
        setDistricts([]); setUpazilas([]); setUnions([]); setWards([]);
        loadChildren(item.id, 'district');
        break;
      case 'district':
        newSelection.district = { id: item.id, name_en: item.name_en, name_bn: item.name_bn };
        newSelection.upazila = null;
        newSelection.union = null;
        newSelection.ward = null;
        setUpazilas([]); setUnions([]); setWards([]);
        loadChildren(item.id, 'upazila');
        break;
      case 'upazila':
        newSelection.upazila = { id: item.id, name_en: item.name_en, name_bn: item.name_bn };
        newSelection.union = null;
        newSelection.ward = null;
        setUnions([]); setWards([]);
        loadChildren(item.id, 'union');
        break;
      case 'union':
        newSelection.union = { id: item.id, name_en: item.name_en, name_bn: item.name_bn };
        newSelection.ward = null;
        setWards([]);
        loadChildren(item.id, 'ward');
        break;
      case 'ward':
        newSelection.ward = { id: item.id, name_en: item.name_en, name_bn: item.name_bn };
        break;
    }

    setSelection(newSelection);
    setActivePicker(null);
    onLocationSelected(newSelection);
  };

  const renderPicker = (level: string, label: string, data: BangladeshLocation[]) => {
    const selectedItem = selection[level as keyof LocationSelection];
    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setActivePicker(activePicker === level ? null : level)}
        >
          <Text style={[styles.pickerText, !selectedItem && styles.placeholderText]}>
            {selectedItem ? selectedItem.name_bn || selectedItem.name_en : `Select ${label}`}
          </Text>
          <Ionicons
            name={activePicker === level ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        <Modal visible={activePicker === level} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActivePicker(null)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              {loadingLocations ? (
                <ActivityIndicator color={Colors.darkGreen} style={{ padding: 20 }} />
              ) : data.length === 0 ? (
                <Text style={styles.noDataText}>No items available</Text>
              ) : (
                <ScrollView style={styles.optionsList}>
                  {data.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.optionRow,
                        selectedItem?.id === item.id && styles.optionRowSelected,
                      ]}
                      onPress={() => handleSelect(level, item)}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedItem?.id === item.id && styles.optionTextSelected,
                      ]}>
                        {item.name_bn || item.name_en}
                      </Text>
                      {selectedItem?.id === item.id && (
                        <Ionicons name="checkmark" size={20} color={Colors.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderPicker('division', 'Division', divisions)}
      {selection.division && renderPicker('district', 'District', districts)}
      {selection.district && renderPicker('upazila', 'Upazila', upazilas)}
      {selection.upazila && renderPicker('union', 'Union', unions)}
      {selection.union && renderPicker('ward', 'Ward', wards)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  pickerContainer: { marginBottom: Spacing.sm },
  pickerLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pickerText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    flex: 1,
  },
  placeholderText: { color: Colors.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  optionsList: { maxHeight: 400 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F5F7F4',
  },
  optionRowSelected: { backgroundColor: Colors.mediumGreen },
  optionText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
  },
  optionTextSelected: { color: Colors.white, fontFamily: Fonts.medium },
  noDataText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
});