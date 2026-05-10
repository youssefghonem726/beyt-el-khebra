import { useUser } from '../context/UserContext';

interface Props { title: string; onBack?: () => void; backLabel?: string; }

export default function Topbar({ title, onBack, backLabel = 'Back' }: Props) {
  const { name } = useUser();
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button className="btn" onClick={onBack} style={{ fontSize: 13, padding: '5px 12px', whiteSpace: 'nowrap' }}>
            ← {backLabel}
          </button>
        )}
        <p className="topbar-user">{name}</p>
      </div>
    </header>
  );
}
