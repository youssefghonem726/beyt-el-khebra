interface ProductionLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

const ProductionLayout: React.FC<ProductionLayoutProps> = ({
  left,
  right,
}) => {
  return (
    <div className="production-layout grid grid-cols-3 gap-6">
      <div className="stack col-span-2 flex flex-col gap-6">
        {left}
      </div>

      <div className="box bg-white p-4 rounded-xl shadow-sm">
        {right}
      </div>
    </div>
  );
};

export default ProductionLayout;