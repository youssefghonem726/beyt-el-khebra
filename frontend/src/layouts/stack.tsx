interface StackProps {
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({ children }) => {
  return <div className="stack flex flex-col gap-6">{children}</div>;
};