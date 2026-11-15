import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  children,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {children}
    </header>
  );
}
