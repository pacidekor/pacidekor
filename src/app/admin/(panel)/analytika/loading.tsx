import {
  AdminAnalyticsListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminAnalytikaLoading() {
  return (
    <AdminLoadingShell>
      <AdminAnalyticsListSkeleton />
    </AdminLoadingShell>
  );
}
