interface Grid4Props {
  children: React.ReactNode;
}

export const Grid4: React.FC<Grid4Props> = ({ children }) => {
  return (
    <div className="grid-4 grid grid-cols-4 gap-4 mb-6">
      {children}
    </div>
  );
};