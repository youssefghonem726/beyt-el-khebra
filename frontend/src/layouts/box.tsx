interface BoxProps {
  title?: string;
  children: React.ReactNode;
}

export const Box: React.FC<BoxProps> = ({ title, children }) => {
  return (
    <div className="box bg-white p-4 rounded-xl shadow-sm">
      {title && <h3 className="mb-4 font-semibold">{title}</h3>}
      {children}
    </div>
  );
};