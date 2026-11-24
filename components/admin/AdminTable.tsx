interface Column {
  key: string;
  label: string;
  width?: string;
}

interface AdminTableProps {
  columns: Column[];
  rows: Array<{ key: string; cells: Array<string | number | React.ReactNode> }>;
  title?: string;
}

/** Generic admin table (Phase 5). Square corners, thin border, restyled by admin.scss. */
export default function AdminTable({ columns, rows, title }: AdminTableProps) {
  return (
    <section className="admin-section">
      {title && <h2 className="admin-section-title">{title}</h2>}
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {r.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
