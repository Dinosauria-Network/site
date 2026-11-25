/** Dashboard charts — plain markup, no chart library, no client JS. */

export interface BarRow {
  key: string;
  label: string;
  value: number;
  href?: string;
  tone?: "accent" | "muted" | "gold" | "danger";
}

const pct = (value: number, max: number) => (max > 0 ? Math.round((value / max) * 100) : 0);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-11-19" → "19 Nov". Parsed field-by-field on purpose: `new Date(str)`
 * would shift the day across timezones for a date-only string.
 */
function shortDay(day?: string): string {
  if (!day) return "—";
  const [, month, date] = day.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(date)} ${name}` : day;
}

/**
 * Horizontal bar list: label · bar · count. Bars are scaled to the largest row
 * so the shape is readable; each row states its share of the total in text for
 * screen readers (the bar itself is decorative).
 */
export function BarList({ rows, unit }: { rows: BarRow[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <ul className="admin-bars">
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
        const body = (
          <>
            <span className="admin-bar-label">{r.label}</span>
            <span className="admin-bar-track" aria-hidden="true">
              <span className={`admin-bar-fill tone-${r.tone ?? "accent"}`} style={{ width: `${pct(r.value, max)}%` }} />
            </span>
            <span className="admin-bar-count">{r.value.toLocaleString("en-US")}</span>
            <span className="visually-hidden">
              {` ${unit}, ${share}% of ${total.toLocaleString("en-US")}`}
            </span>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <a className="admin-bar-row" href={r.href}>{body}</a>
            ) : (
              <span className="admin-bar-row">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Single-series column chart, with the same numbers available as a table. */
export function DailyBars({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const range = `${shortDay(days[0]?.day)} – ${shortDay(days[days.length - 1]?.day)}`;

  return (
    <figure className="admin-daily">
      <div className="admin-daily-bars" aria-hidden="true">
        {days.map((d) => {
          const [, month, day] = d.day.split("-");
          return (
            <div className="admin-daily-col" key={d.day} title={`${d.day}: ${d.count}`}>
              <span className="admin-daily-value">{d.count}</span>
              <span className="admin-daily-track">
                <span className="admin-daily-bar" style={{ height: `${Math.max(pct(d.count, max), d.count > 0 ? 3 : 0)}%` }} />
              </span>
              <span className="admin-daily-label">{`${day}/${month}`}</span>
            </div>
          );
        })}
      </div>

      <figcaption className="admin-chart-note">
        {total.toLocaleString("en-US")} papers added, {range}.
      </figcaption>

      <table className="visually-hidden">
        <caption>{`Papers added per day, ${range}`}</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Papers</th></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}><th scope="row">{d.day}</th><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
