import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const toggle = () => {
    i18n.changeLanguage(isArabic ? 'en' : 'ar');
  };

  return (
    <button
      onClick={toggle}
      className="lang-toggle"
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {isArabic ? 'EN' : 'ع'}
    </button>
  );
}
