export const COMPANY = {
  name: 'Ак-Куу',
  fullName: 'ОАО «Ак-Куу»',
  tagline: 'Кормим Кыргызстан',
  heroTitle: 'Свежие яйца, которым доверяет вся страна',
  heroSubtitle:
    'С 1966 года мы поставляем свежие, отборные яйца в каждый уголок Кыргызстана — с непревзойдённым качеством и надёжностью.',
  foundedYear: 1966,
  experienceYears: 60,
  dailyProduction: '200 000+',
  customers: '1 000+',
  website: 'https://akkuu.kg',
  address: 'Краснодарская улица, 60, с. Сокулук, Чуйская область',
  region: 'Кыргызстан',
  workingHours: [
    { days: 'Пн–Пт', hours: '08:00 – 17:00' },
    { days: 'Сб, Вс', hours: 'Выходной' },
  ],
} as const;

export const STATS = [
  { value: 200000, suffix: '+', label: 'Яиц в день' },
  { value: 60, suffix: '+', label: 'Лет на рынке' },
  { value: 1000, suffix: '+', label: 'Партнёров по стране' },
  { value: 24, suffix: '/7', label: 'Контроль качества' },
] as const;
