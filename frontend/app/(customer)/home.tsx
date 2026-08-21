import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Post, ProductType } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

const SORT_OPTIONS = ['Nearest', 'Price: Low', 'Price: High', 'Stock', 'Rating'];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const imageTints = [colors.lightGreen, '#FFE4C4', colors.paleYellow, colors.sageGreen];
  const [posts, setPosts] = useState<Post[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('Nearest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    api.getProductTypes(token ?? null).then(setProductTypes).catch(() => {});
  }, [token]);

  const loadPosts = useCallback(async () => {
    if (!token || !user?.location) return;
    try {
      let data: Post[];
      if (search.trim()) {
        data = await api.searchByKeyword(search.trim(), user.location.id, token);
      } else {
        data = await api.getPosts(token, { union: user.location.id });
      }
      if (selectedTypeId) {
        data = data.filter((p) => p.product_type === selectedTypeId);
      }
      setPosts(data);
    } catch {
      setPosts([]);
    }
  }, [token, user, search, selectedTypeId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPosts().finally(() => setLoading(false));
    }, [loadPosts]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === 'Nearest') {
      return (a.distance_km ?? 999) - (b.distance_km ?? 999);
    }
    if (sortBy === 'Price: Low') {
      return parseFloat(a.price_per_kg) - parseFloat(b.price_per_kg);
    }
    if (sortBy === 'Price: High') {
      return parseFloat(b.price_per_kg) - parseFloat(a.price_per_kg);
    }
    if (sortBy === 'Rating') {
      return (b.farmer_avg_rating ?? 0) - (a.farmer_avg_rating ?? 0);
    }
    return parseFloat(b.total_weight_kg) - parseFloat(a.total_weight_kg);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.delivering}>Delivering to</Text>
            <Text style={styles.location}>
              {user?.location
                ? [user.location.union, user.location.upazila, user.location.district].filter(Boolean).join(', ')
                : 'Your location'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/(customer)/account')}
          >
            <Ionicons name="person" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.white} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rice, potato, vegetables..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadPosts}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortOpen(true)}>
          <Ionicons name="options" size={16} color={colors.darkGreen} />
          <Text style={styles.sortButtonText}>Sort: {sortBy}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.darkGreen} />
        </TouchableOpacity>
      </View>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortOpen(false)}>
          <View style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>Sort listings</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortSheetItem, sortBy === opt && styles.sortSheetItemActive]}
                onPress={() => {
                  setSortBy(opt);
                  setSortOpen(false);
                }}
              >
                <Text style={[styles.sortSheetText, sortBy === opt && styles.sortSheetTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.count}>{sorted.length} listings near you</Text>
        {loading ? (
          <ActivityIndicator color={colors.darkGreen} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <Text style={styles.empty}>No listings found. Try a different search.</Text>
        ) : (
          sorted.map((post, i) => (
            <ProductCard
              key={post.id}
              post={post}
              imageTint={imageTints[i % imageTints.length]}
              onPress={() => router.push(`/product/${post.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  header: { backgroundColor: Colors.headerGreen, paddingTop: 48, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  delivering: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  location: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textOnPrimary },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.mediumGreen, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.pill, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textOnPrimary, paddingVertical: Spacing.sm },
  sortContainer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sortButtonText: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: Colors.textDark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' },
  sortSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  sortSheetTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: Spacing.sm },
  sortSheetItem: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
  sortSheetItemActive: { backgroundColor: Colors.paleGreen },
  sortSheetText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textDark },
  sortSheetTextActive: { color: Colors.darkGreen },
  list: { flex: 1 },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  count: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.md },
  empty: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});
