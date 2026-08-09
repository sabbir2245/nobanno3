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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Post, ProductType } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const SORT_OPTIONS = ['Nearest', 'Price: Low', 'Price: High', 'Stock', 'Rating'];
const imageTints = [Colors.lightGreen, '#FFE4C4', Colors.paleYellow, Colors.sageGreen];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('Nearest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);

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
            <Ionicons name="person" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.lightGreen} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rice, potato, vegetables..."
            placeholderTextColor={Colors.lightGreen}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadPosts}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={() => setShowSearchFilters(!showSearchFilters)}>
            <Ionicons name="options" size={18} color={Colors.lightGreen} />
          </TouchableOpacity>
        </View>
      </View>

      {showSearchFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Filter by type:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTypeRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, selectedTypeId === null && styles.chipActive]}
              onPress={() => setSelectedTypeId(null)}
            >
              <Text style={[styles.filterChipText, selectedTypeId === null && styles.chipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {productTypes.map((pt) => (
              <TouchableOpacity
                key={pt.id}
                style={[styles.filterChip, selectedTypeId === pt.id && styles.chipActive]}
                onPress={() => setSelectedTypeId(pt.id)}
              >
                <Text style={[styles.filterChipText, selectedTypeId === pt.id && styles.chipTextActive]}>
                  {pt.name_bn || pt.name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.chip, selectedTypeId === null && styles.chipActive]}
          onPress={() => setSelectedTypeId(null)}
        >
          <Text style={[styles.chipText, selectedTypeId === null && styles.chipTextActive]}>
            সব
          </Text>
        </TouchableOpacity>
        {productTypes.map((pt) => (
          <TouchableOpacity
            key={pt.id}
            style={[styles.chip, selectedTypeId === pt.id && styles.chipActive]}
            onPress={() => setSelectedTypeId(pt.id)}
          >
            <Text style={[styles.chipText, selectedTypeId === pt.id && styles.chipTextActive]}>
              {pt.name_bn || pt.name_en}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={16} color={Colors.darkGreen} />
          <Text style={styles.filterText}>Sort</Text>
        </TouchableOpacity>
      </ScrollView>

      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortRow}
          contentContainerStyle={styles.categoriesContent}
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortChip, sortBy === opt && styles.chipActive]}
              onPress={() => setSortBy(opt)}
            >
              <Text style={[styles.chipText, sortBy === opt && styles.chipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.count}>{sorted.length} listings near you</Text>
        {loading ? (
          <ActivityIndicator color={Colors.darkGreen} style={{ marginTop: 40 }} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  header: { backgroundColor: Colors.headerGreen, paddingTop: 48, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  delivering: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.lightGreen },
  location: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.white },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.mediumGreen, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.pill, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.white, paddingVertical: Spacing.sm },
  filterPanel: { backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.xs },
  filterTypeRow: { gap: Spacing.sm, alignItems: 'center' },
  filterChip: { backgroundColor: Colors.lightGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  filterChipText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.darkGreen },
  categories: { maxHeight: 52, backgroundColor: Colors.paleGreen },
  categoriesContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, alignItems: 'center' },
  chip: { backgroundColor: Colors.lightGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  chipActive: { backgroundColor: Colors.darkGreen },
  chipText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.darkGreen },
  chipTextActive: { color: Colors.white },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm },
  filterText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.darkGreen },
  sortRow: { maxHeight: 44 },
  sortChip: { backgroundColor: Colors.white, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  list: { flex: 1 },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  count: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.md },
  empty: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});