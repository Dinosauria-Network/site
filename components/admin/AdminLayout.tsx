import { Suspense } from "react";
import "../../app/styles/admin.scss";
import AdminToasts from "./AdminToasts";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <AdminToasts />
      {children}
    </div>
  );
}
