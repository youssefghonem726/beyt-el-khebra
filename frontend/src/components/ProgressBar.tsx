interface Props {
  percent: number;
  color?: 'green' | 'orange' | 'red';
  style?: React.CSSProperties;
}

export default function ProgressBar({ percent, color, style }: Props) {
  const cls = color ? `progress-bar progress-${color}` : 'progress-bar';
  return (
    <div className={cls} style={style}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
