interface Props {
  label: string;
  value: string | number;
  sub?: string;
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <article className="card stat-card">
      <h3>{label}</h3>
      <p className="metric">{value}</p>
      {sub && <p>{sub}</p>}
    </article>
  );
}
