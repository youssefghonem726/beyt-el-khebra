import { useUser } from '../context/UserContext';

interface Props { title: string; }

export default function Topbar({ title }: Props) {
  const { name } = useUser();
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <p className="topbar-user">{name}</p>
    </header>
  );
}
