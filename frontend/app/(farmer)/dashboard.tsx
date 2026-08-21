import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Post } from '@/services/api';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function FarmerDashboardScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { token, user, refreshProfile } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { t } = useTranslation();

  const load = useCallback(async () => {
    if (!token) return;
    await refreshProfile();
    const postsData = user?.id
      ? await api.getPosts(token, { farmer_id: user.id })
      : [];
    setMyPosts(postsData);
  }, [token, user?.id, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmEdit = (postId: number) => {
    Alert.alert('Edit Post', 'Are you sure you want to edit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => router.push(`/(farmer)/edit-post/${postId}`) },
    ]);
  };

  const confirmDelete = (postId: number) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setDeletingId(postId);
          try {
            await api.deletePost(token, postId);
            await load();
          } catch {
            Alert.alert('Error', 'Could not delete post.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Nobanno</Text>
          <Text style={styles.hub}>FarmerHub</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(farmer)/account')}
        >
          <Ionicons name="person" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          {user?.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.profileInitial}>
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || user?.username}</Text>
          <Text style={styles.profileAddress}>
            {user?.address || 'Address not set'}
          </Text>
          <Text style={styles.profilePhone}>
            {user?.phone_number || 'Phone not set'} — {user?.name || user?.username}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(farmer)/post')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={styles.createBtnText}>Create New Post</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>My Posts</Text>
        {myPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postInfo}>
              {post.image ? (
                <Image source={{ uri: post.image }} style={styles.postThumb} />
              ) : (
                <View style={styles.postThumbPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.postDetails}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postMeta}>
                  ৳ {parseFloat(post.price_per_kg).toFixed(0)}/kg ·{' '}
                  {post.total_weight_kg} kg
                </Text>
              </View>
            </View>
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => confirmEdit(post.id)}
              >
                <Ionicons name="create-outline" size={18} color={colors.darkGreen} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(post.id)}
                disabled={deletingId === post.id}
              >
                <Ionicons
                  name={deletingId === post.id ? 'hourglass' : 'trash-outline'}
                  size={18}
                  color={colors.red}
                />
                <Text style={styles.deleteBtnText}>
                  {deletingId === post.id ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {myPosts.length === 0 && (
          <Text style={styles.empty}>No posts yet. Create a listing to get started.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paleGreen,
  },
  header: {
    backgroundColor: Colors.headerGreen,
    paddingTop: 48,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textOnPrimary,
    opacity: 0.8,
  },
  hub: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: Colors.textOnPrimary,
    lineHeight: 30,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mediumGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    backgroundColor: Colors.cream,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mediumGreen,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInitial: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.textOnPrimary,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textDark,
  },
  profileAddress: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profilePhone: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  createBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textOnPrimary,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  postInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  postThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.lightGreen,
  },
  postThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  postTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textDark,
  },
  postMeta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  editBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.darkGreen,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  deleteBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.red,
  },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
