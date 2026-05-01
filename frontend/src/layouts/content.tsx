interface ContentLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  left,
  right,
}) => {
  return (
    <div className="content grid grid-cols-3 gap-6">
      <div className="table-wrap col-span-2">{left}</div>
      <div className="stack flex flex-col gap-4">{right}</div>
    </div>
  );
};