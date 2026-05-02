interface Props {
  title: string;
  userName: string;
}

export default function Topbar({ title, userName }: Props) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <p className="topbar-user">{userName}</p>
    </header>
  );
}
