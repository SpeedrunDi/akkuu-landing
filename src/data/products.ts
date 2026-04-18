export type Product = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  image: string;
  accent: string;
  tags: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    slug: 'vysshiy-sort',
    name: 'Яйца высшего сорта',
    shortDescription: 'Для ресторанов и кондитерских',
    description:
      'Крупные отборные яйца из первой линии инкубатора. Стабильная масса, прочная скорлупа, ярко-жёлтый желток — идеальная основа для профессиональной кухни.',
    image: '/images/products/premium.webp',
    accent: 'Premium',
    tags: ['Высший сорт', 'Вес 65–75 г', 'Отборные'],
  },
  {
    id: 2,
    slug: 'nariste',
    name: 'Наристе',
    shortDescription: 'Выбор всей семьи',
    description:
      'Наш бестселлер для домашнего стола. Свежесть каждой партии, упаковка по 10 штук, стабильное качество день за днём.',
    image: '/images/products/nariste10.webp',
    accent: 'Хит продаж',
    tags: ['Упаковка 10 шт', 'Столовые', 'Свежие ежедневно'],
  },
  {
    id: 3,
    slug: 'keremet',
    name: 'Керемет',
    shortDescription: 'Линейка здорового питания',
    description:
      'Яйца от кур на сбалансированном рационе с повышенным содержанием омега-3 и витаминов группы В. Для тех, кто следит за тем, что попадает на стол.',
    image: '/images/products/keremet10.webp',
    accent: 'Ωmega-3',
    tags: ['Обогащённые', 'Омега-3', 'Витамины группы B'],
  },
  {
    id: 4,
    slug: 'brown',
    name: 'Яйца в коричневой скорлупе',
    shortDescription: 'Натуральный выбор',
    description:
      'Яйца от кур с коричневым оперением. Насыщенный вкус, плотная скорлупа — выбор тех, кто ценит натуральность и традиционный домашний вкус.',
    image: '/images/products/brown_eggs.webp',
    accent: 'Natural',
    tags: ['Коричневая скорлупа', 'Натуральные', 'Домашний вкус'],
  },
];
