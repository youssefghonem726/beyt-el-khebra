interface TableWrapProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const TableWrap: React.FC<TableWrapProps> = ({
  title,
  actions,
  children,
}) => {
  return (
    <div className="table-wrap bg-white rounded-xl shadow-sm">
      <div className="table-head flex justify-between items-center p-4 border-b">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
};