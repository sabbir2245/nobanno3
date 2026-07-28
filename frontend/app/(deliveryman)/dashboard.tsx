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
import { api, Order, DeliverymanPackage } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DeliverymanDashboard() {
  const { token, user, location } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [packageSummary, setPackageSummary] = useState<DeliverymanPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'my-deliveries'>('available');

  const fetchDashboard = async (tab = activeTab) => {
    if (!token) return;
    setLoading(true);
    try {
      console.log('[DELIVERYMAN] Fetching dashboard...');
      const params = {
        ...(location ? { lat: location.latitude, lng: location.longitude, radius: 50 } : {}),
        tab,
      };
      const result = await api.getDeliverymanDashboard(token, params);
      console.log('[DELIVERYMAN] Got', result.orders.length, 'available orders');
      setOrders(result.orders);
      setPackageSummary(result.package_summary);
    } catch (err) {
      console.log('[DELIVERYMAN] Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(activeTab);
  }, [token, location, activeTab]);

  const handleAcceptOrder = async (orderId: number) => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      console.log('[DELIVERYMAN] Accepting order', orderId);
      await api.acceptOrder(token, orderId);
      setActiveTab('my-deliveries');
      Alert.alert('Accepted', 'Order moved to My Deliveries. Confirm pickup after receiving it from the farmer.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePickup = async (orderId: number) => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      console.log('[DELIVERYMAN] Picking up order', orderId);
      await api.pickupOrder(token, orderId);
      Alert.alert('Pickup confirmed', 'The product is now out for delivery to the customer.');
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark pickup');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliver = async (orderId: number) => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      console.log('[DELIVERYMAN] Delivering order', orderId);
      await api.deliverOrder(token, orderId);
      Alert.alert('Delivered', 'Delivery to the customer has been confirmed.');
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark delivery');
    } finally {
      setActionLoading(null);
    }
  };

  const callFarmer = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderOrderCard = (order: Order) => {
    const isAssignedToMe = order.deliveryman && order.deliveryman_username === user?.username;

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>{order.post_title}</Text>
          <View style={[
            styles.statusBadge,
            order.status === 'shipped' && styles.statusShipped,
            order.status === 'assigned' && styles.statusAssigned,
            order.status === 'out_for_delivery' && styles.statusOutForDelivery,
          ]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.orderDetail}>
          <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.orderDetailText}>
            Farmer: {order.post_farmer_name}
          </Text>
        </View>

        {order.post_farmer_phone && (
          <TouchableOpacity
            style={styles.orderDetail}
            onPress={() => callFarmer(order.post_farmer_phone!)}
          >
            <Ionicons name="call-outline" size={14} color={Colors.mediumGreen} />
            <Text style={[styles.orderDetailText, { color: Colors.mediumGreen }]}>
              {order.post_farmer_phone} (Tap to call)
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.orderDetail}>
          <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.orderDetailText}>
            {order.quantity_kg} kg - ৳{parseFloat(order.total_paid).toFixed(0)}
          </Text>
        </View>

        {order.post_collection_point_address && (
          <View style={styles.orderDetail}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.orderDetailText}>
              Pickup: {order.post_collection_point_address}
            </Text>
          </View>
        )}

        {order.distance_km !== undefined && (
          <View style={styles.orderDetail}>
            <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.orderDetailText}>
              {order.distance_km.toFixed(1)} km away
            </Text>
          </View>
        )}

        <View style={styles.orderDetail}>
          <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.orderDetailText}>
            Customer: {order.customer_name || order.customer_username}
          </Text>
        </View>

        {order.delivery_address && (
          <View style={styles.orderDetail}>
            <Ionicons name="home-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.orderDetailText}>
              Deliver to: {order.delivery_address}
            </Text>
          </View>
        )}

        {/* Action buttons based on status */}
        {order.status === 'shipped' && !order.deliveryman && (
          <PrimaryButton
            title="Accept Order"
            onPress={() => handleAcceptOrder(order.id)}
            loading={actionLoading === order.id}
            style={styles.actionBtn}
          />
        )}

        {order.status === 'assigned' && isAssignedToMe && (
          <PrimaryButton
            title="Confirm Product Received from Farmer"
            onPress={() => handlePickup(order.id)}
            loading={actionLoading === order.id}
            variant="sage"
            style={styles.actionBtn}
          />
        )}

        {order.status === 'out_for_delivery' && isAssignedToMe && (
          <PrimaryButton
            title="Delivered to Customer"
            onPress={() => handleDeliver(order.id)}
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Package Summary */}
        {activeTab === 'available' && packageSummary && packageSummary.total_orders > 0 && (
          <View style={styles.packageSummary}>
            <Text style={styles.packageTitle}>Available Package Summary</Text>
            <View style={styles.packageRow}>
              <View style={styles.packageItem}>
                <Text style={styles.packageValue}>{packageSummary.total_orders}</Text>
                <Text style={styles.packageLabel}>Orders</Text>
              </View>
              <View style={styles.packageItem}>
                <Text style={styles.packageValue}>{packageSummary.farmer_count}</Text>
                <Text style={styles.packageLabel}>Farmers</Text>
              </View>
              <View style={styles.packageItem}>
                <Text style={styles.packageValue}>৳{packageSummary.total_amount.toFixed(0)}</Text>
                <Text style={styles.packageLabel}>Total Value</Text>
              </View>
            </View>

            {packageSummary.farmers.map((farmer) => (
              <TouchableOpacity
                key={farmer.farmer_id}
                style={styles.farmerCard}
                onPress={() => farmer.farmer_phone && callFarmer(farmer.farmer_phone)}
              >
                <View style={styles.farmerHeader}>
                  <Ionicons name="person-circle" size={24} color={Colors.darkGreen} />
                  <Text style={styles.farmerName}>{farmer.farmer_name}</Text>
                  {farmer.farmer_phone && (
                    <Ionicons name="call" size={18} color={Colors.mediumGreen} style={{ marginLeft: 'auto' }} />
                  )}
                </View>
                <Text style={styles.farmerProducts}>
                  {farmer.products.length} product(s) - ৳{farmer.total_amount.toFixed(0)}
                </Text>
                {farmer.products.map((p, idx) => (
                  <Text key={idx} style={styles.productItem}>
                    • {p.product_title} ({p.quantity_kg} kg)
                  </Text>
                ))}
                {(farmer.collection_district || farmer.collection_point_address) && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={Colors.textMuted} />
                    <Text style={styles.locationText}>
                      {[farmer.collection_district, farmer.collection_upazila, farmer.collection_union]
                        .filter(Boolean).join(', ')}
                      {farmer.collection_point_address ? ` - ${farmer.collection_point_address}` : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              Available ({orders.length})
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
        ) : orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bicycle-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'available' ? 'No orders available' : 'No deliveries assigned'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'available'
                ? 'Check back later for new orders in your area.'
                : 'Accept a nearby order to start a delivery.'}
            </Text>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl + Spacing.md },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark, marginTop: Spacing.md },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  packageSummary: {
    backgroundColor: Colors.cream,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  packageTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.darkGreen, marginBottom: Spacing.sm },
  packageRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  packageItem: { alignItems: 'center' },
  packageValue: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.darkGreen },
  packageLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  farmerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  farmerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  farmerName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark, marginLeft: Spacing.sm, flex: 1 },
  farmerProducts: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  productItem: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textDark, marginLeft: Spacing.md },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginLeft: 4, flex: 1 },
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
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  orderTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.darkGreen, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusShipped: { backgroundColor: '#E3F2FD' },
  statusAssigned: { backgroundColor: '#FFF3E0' },
  statusOutForDelivery: { backgroundColor: '#E8F5E9' },
  statusText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textDark },
  orderDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  orderDetailText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, marginLeft: 6 },
  actionBtn: { marginTop: Spacing.sm },
});
