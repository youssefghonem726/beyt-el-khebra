import type { ReactNode } from 'react';

interface Props {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function TableWrap({ title, actions, children, style }: Props) {
  return (
    <section className="table-wrap" style={style}>
      {(title || actions) && (
        <div className="table-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="actions-inline">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
