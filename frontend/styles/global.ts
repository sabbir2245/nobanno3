import { StyleSheet } from "react-native";
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';


export const globalstyles = StyleSheet.create( {

    container: {
        flex: 1,
        backgroundColor: Colors.paleGreen,
      },
      content: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
      },
      profileCard: {
        flexDirection: 'row',
        backgroundColor: Colors.cream,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.md,
      },
      avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.darkGreen,
        alignItems: 'center',
        justifyContent: 'center',
      },
      avatarText: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: Colors.white,
      },
      profileInfo: {
        flex: 1,
      },
      name: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.textDark,
      },
      phone: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textMuted,
        marginTop: 2,
      },
      address: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 4,
      },
      walletCard: {
        backgroundColor: Colors.darkGreen,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
      },
      walletLabel: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.lightGreen,
      },
      walletValue: {
        fontFamily: Fonts.bold,
        fontSize: 28,
        color: Colors.white,
        marginTop: Spacing.xs,
      },
      sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: Colors.textDark,
        marginBottom: Spacing.md,
      },
      empty: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textMuted,
      },
      invoiceCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
      },
      invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      invoiceTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: Colors.textDark,
      },
      statusBadge: {
        backgroundColor: Colors.paleYellow,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
      },
      statusDone: {
        backgroundColor: Colors.paleGreen,
      },
      statusShipped: {
        backgroundColor: Colors.lightOrange,
      },
      statusText: {
        fontFamily: Fonts.medium,
        fontSize: 11,
        color: Colors.textDark,
        textTransform: 'capitalize',
      },
      invoiceProduct: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: Colors.textDark,
        marginTop: Spacing.xs,
      },
      invoiceDetail: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textMuted,
        marginTop: 2,
      },
      invoiceFarmer: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.mediumGreen,
        marginTop: 4,
      },
      reviewDoneBadge: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.lightGreen,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignSelf: 'flex-start',
      },
      reviewDoneText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: Colors.mediumGreen,
      },

    }
)

export const authStyles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paleGreen },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: 50,
  },
  brand: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: Colors.darkGreen,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.textDark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  link: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.darkGreen,
    textDecorationLine: 'underline',
  },
})