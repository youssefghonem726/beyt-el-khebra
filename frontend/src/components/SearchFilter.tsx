import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FilterOption {
  label: string;
  value: string;
}

interface Props {
  placeholder?: string;
  filters?: FilterOption[];
  onSearch: (query: string, filter: string) => void;
}

export default function SearchFilter({ placeholder = 'Search...', filters, onSearch }: Props) {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);

  const apply = () => {
    onSearch(query, filter);
    setOpen(false);
  };

  return (
    <div className="search-container">
      <input
        className="input"
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
      {filters && (
        <>
          <button className="filter-icon" type="button" onClick={() => setOpen((o) => !o)}>
            🔽
          </button>
          {open && (
            <div className="filter-dropdown show">
              <div className="field">
                <label>{t('filter.status')}</label>
                <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="">{t('filter.allStatus')}</option>
                  {filters.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn primary" type="button" onClick={apply}>{t('filter.apply')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
