/** Serializable DTOs for admin UI (no secrets). */

export type AdminPlatformStatsClient = {
  totalUsers: number;
  usersWebsiteOnly: number;
  usersTelegramOnly: number;
  usersBothLinked: number;
  activeManagedSubscriptions: number;
  expiredManagedSubscriptions: number;
  freeUsersApprox: number;
  paidUsersApprox: number;
  revenuePaymeMinor: number;
  revenueManagedPurchasedMinor: number;
  totalRevenueMinor: number;
  mostPopularPlanSlug: string | null;
  mostPopularPlanCount: number;
  /** `User.authSource` — faqat Telegram jadvalidagi qatorlar. */
  userAuthTelegram: number;
  userAuthBoth: number;
  /** Faol boshqariladigan obunalar `acquisitionChannel` bo‘yicha (null = belgilanmagan). */
  managedAcqTelegramMiniApp: number;
  managedAcqWebsite: number;
  managedAcqAdmin: number;
  managedAcqUnset: number;
};

export type UnifiedUserAdminRow = {
  rowKey: string;
  kind: "telegram" | "web_only";
  telegramUserId: string | null;
  webUserId: string | null;
  fullName: string;
  emailOrPhone: string;
  role: string;
  registeredAt: string;
  lastLoginAt: string | null;
  source: "website" | "telegram" | "both";
  sitesCount: number;
  exportsCount: number;
  managedPlanSlug: string | null;
  managedPlanName: string | null;
  managedStatus: string | null;
  managedStartsAt: string | null;
  managedEndsAt: string | null;
  managedSource: string | null;
  legacyPlanLabel: string | null;
  isActive: boolean;
};

export type ManagedPlanClientRow = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  discountPriceMinor: number | null;
  billingPeriodDays: number;
  generationLimit: number | null;
  exportLimit: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditLogClientRow = {
  id: string;
  action: string;
  actor: string;
  targetTelegramUserId: string | null;
  targetWebUserId: string | null;
  managedSubscriptionId: string | null;
  payload: unknown;
  createdAt: string;
};
