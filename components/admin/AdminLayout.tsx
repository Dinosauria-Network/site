import { Suspense } from "react";
import "../../app/styles/admin.scss";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-layout">{children}</div>;
}
