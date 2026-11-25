import AdminLayout from "@/components/admin/AdminLayout";

/**
 * Admin area layout (Phase 5) — owns the admin chrome for every /admin/* route.
 * Renders the shared admin shell (toasts + admin-layout); the pages supply the
 * admin header / nav / breadcrumbs / main / footer as children.
 */
export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
