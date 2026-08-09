import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { api, Batch } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DeliverymanDashboard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'my-deliveries'>('available');

  const fetchBatches = async (tab = activeTab) => {
    if (!token) return;
    setLoading(true);
    try {
      console.log(`[DELIVERYMAN] Fetching ${tab} batches...`);
      const data = tab === 'available'
        ? await api.getAvailableBatches(token)
        : await api.getMyBatches(token);
      setBatches(data);
      console.log('[DELIVERYMAN] Got', data.length, 'batches');
    } catch (err) {
      console.log('[DELIVERYMAN] Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches(activeTab);
  }, [token, activeTab]);

  const handleAccept = async (batchId: number) => {
    if (!token) return;
    setActionLoading(batchId);
    try {
      console.log('[DELIVERYMAN] Accepting batch', batchId);
      await api.acceptBatch(token, batchId);
      setActiveTab('my-deliveries');
      Alert.alert('Accepted', 'Batch moved to My Deliveries. Go to the union pickup point.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept batch');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliver = async (batchId: number) => {
    if (!token) return;
    setActionLoading(batchId);
    try {
      console.log('[DELIVERYMAN] Delivering batch', batchId);
      await api.deliverBatch(token, batchId);
      Alert.alert('Delivered', 'Batch delivered. All member orders are now completed.');
      fetchBatches();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark batch delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const callFarmer = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const renderBatchCard = (batch: Batch) => {
    const location = batch.union;
    const locationLabel = [location.division, location.district, location.upazila, location.union]
      .filter(Boolean).join(', ');
    const farmerCount = new Set(batch.items.map((i) => i.farmer)).size;

    return (
      <View key={batch.id} style={styles.batchCard}>
        <View style={styles.batchHeader}>
          <View style={styles.batchTitleWrap}>
            <Text style={styles.batchTitle}>Batch #{batch.id}</Text>
            <Text style={styles.batchProduct}>
              {batch.product_type_name_en || batch.product_type_name_bn || 'Product'}
            </Text>
          </View>
          <View style={[styles.statusBadge, batch.status === 'assigned' && styles.statusAssigned]}>
            <Text style={styles.statusText}>{batch.status}</Text>
          </View>
        </View>

        <View style={styles.orderDetail}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.orderDetailText}>Pickup union: {locationLabel || '—'}</Text>
        </View>
        <View style={styles.orderDetail}>
          <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.orderDetailText}>
            {parseFloat(batch.total_quantity_kg).toFixed(0)} kg · ৳{parseFloat(batch.total_value).toFixed(0)} · {farmerCount} farmer(s)
          </Text>
        </View>

        {batch.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText}>
              • {item.post_title} ({item.quantity_kg} kg) — {item.farmer_name}
            </Text>
            {item.farmer_phone && (
              <TouchableOpacity onPress={() => callFarmer(item.farmer_phone)}>
                <Ionicons name="call" size={16} color={Colors.mediumGreen} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {batch.items.some((i) => i.collection_point_address) && (
          <View style={styles.orderDetail}>
            <Ionicons name="flag-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.orderDetailText}>
              Pick at: {batch.items.find((i) => i.collection_point_address)?.collection_point_address}
            </Text>
          </View>
        )}

        {activeTab === 'available' && (
          <PrimaryButton
            title="Accept Batch"
            onPress={() => handleAccept(batch.id)}
            loading={actionLoading === batch.id}
            style={styles.actionBtn}
          />
        )}

        {activeTab === 'my-deliveries' && batch.status === 'assigned' && (
          <PrimaryButton
            title="Delivered at Union — Mark Complete"
            onPress={() => handleDeliver(batch.id)}
            loading={actionLoading === batch.id}
            variant="primary"
            style={styles.actionBtn}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Delivery Dashboard" subtitle={user?.name || 'Deliveryman'} />
      <TouchableOpacity
        style={styles.areasBtn}
        onPress={() => router.push('/(deliveryman)/service-areas' as any)}
      >
        <Ionicons name="map-outline" size={16} color={Colors.white} />
        <Text style={styles.areasBtnText}>Service Areas</Text>
      </TouchableOpacity>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              Available ({batches.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-deliveries' && styles.activeTab]}
            onPress={() => setActiveTab('my-deliveries')}
          >
            <Text style={[styles.tabText, activeTab === 'my-deliveries' && styles.activeTabText]}>
              My Deliveries
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.darkGreen} style={{ marginTop: 40 }} />
        ) : batches.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bicycle-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'available' ? 'No batches available' : 'No batches assigned'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'available'
                ? 'Batches appear here once a union\'s pending pool crosses the area threshold.'
                : 'Accept an available batch to start a pickup.'}
            </Text>
          </View>
        ) : (
          batches.map(renderBatchCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  areasBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.mediumGreen, marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    borderRadius: Radius.md, paddingVertical: Spacing.sm,
  },
  areasBtnText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.white },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl + Spacing.md },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  tabBar: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: 2,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  activeTab: { backgroundColor: Colors.darkGreen },
  tabText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textMuted },
  activeTabText: { color: Colors.white },
  batchCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  batchTitleWrap: { flex: 1 },
  batchTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.darkGreen },
  batchProduct: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#E3F2FD' },
  statusAssigned: { backgroundColor: '#FFF3E0' },
  statusText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textDark, textTransform: 'capitalize' },
  orderDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  orderDetailText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, marginLeft: 6, flex: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginBottom: 4,
  },
  itemText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textDark, flex: 1, marginRight: 8 },
  actionBtn: { marginTop: Spacing.sm },
});
