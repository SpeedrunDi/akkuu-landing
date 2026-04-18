export type ContactItem = {
  icon: 'phone' | 'mail' | 'map-pin';
  label: string;
  values: { text: string; href: string }[];
};

export const CONTACTS: ContactItem[] = [
  {
    icon: 'phone',
    label: 'Коммерческий отдел',
    values: [{ text: '+996 772 070 749', href: 'tel:+996772070749' }],
  },
  {
    icon: 'phone',
    label: 'Диспетчерская',
    values: [
      { text: '+996 770 031 966', href: 'tel:+996770031966' },
      { text: '+996 554 031 966', href: 'tel:+996554031966' },
    ],
  },
  {
    icon: 'mail',
    label: 'Коммерческий отдел',
    values: [{ text: 'commercial@akkuu.kg', href: 'mailto:commercial@akkuu.kg' }],
  },
  {
    icon: 'mail',
    label: 'Приёмная',
    values: [{ text: 'reception@akkuu.kg', href: 'mailto:reception@akkuu.kg' }],
  },
  {
    icon: 'mail',
    label: 'Почта',
    values: [{ text: 'oao-akkyy@mail.ru', href: 'mailto:oao-akkyy@mail.ru' }],
  },
  {
    icon: 'map-pin',
    label: 'Адрес',
    values: [
      {
        text: 'Краснодарская 60, с. Сокулук, Чуйская область',
        href: 'https://go.2gis.com/EvG1A',
      },
    ],
  },
];
