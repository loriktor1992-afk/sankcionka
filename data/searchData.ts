export type SearchItem = {
  value: string;
};

type Car = {
  slug: string;
  name: string;
  year: string;
  mileage: string;
  price: string;
  transmission: string;
  drive: string;
  auctionGrade: string;
  photos: string[];
  description: string;
};

type Mark = {
  slug: string;
  name: string;
  cars: Car[];
};

type Brand = {
  slug: string;
  name: string;
  marks: Mark[];
};

type TopCar = {
  brandSlug: string;
  markSlug: string;
  carSlug: string;
  price: string;
  brand: string;
  model: string;
  year: string;
  photo: string;
};

const data: {
  brands: Brand[];
  topCars: TopCar[];
} = {
  brands: [
    {
      slug: 'toyota',
      name: 'Toyota',
      marks: [
        {
          slug: 'aqua',
          name: 'Aqua',
          cars: [
            {
              slug: 'aqua-2021-58555',
              name: 'Aqua 2021',
              year: '2021',
              mileage: '58555',
              price: '1350000',
              transmission: 'вариатор',
              drive: 'передний',
              auctionGrade: '4.5',
              photos: [
                '/images/cars/toyota/aqua/aqua-1.jpg',
                '/images/cars/toyota/aqua/aqua-2.jpg',
              ],
              description: 'Гибрид, отличное состояние',
            },
            {
              slug: 'aqua-2022-40000',
              name: 'Aqua 2022',
              year: '2022',
              mileage: '40000',
              price: '1500000',
              transmission: 'автомат',
              drive: 'передний',
              auctionGrade: '5.0',
              photos: [
                '/images/cars/toyota/aqua/aqua-3.jpg',
                '/images/cars/toyota/aqua/aqua-4.jpg',
              ],
              description: 'Низкий пробег, как новая',
            },
          ],
        },
        {
          slug: 'prius',
          name: 'Prius',
          cars: [],
        },
      ],
    },
  ],
  topCars: [
    {
      brandSlug: 'toyota',
      markSlug: 'aqua',
      carSlug: 'aqua-2021-58555',
      price: '1350000',
      brand: 'Toyota',
      model: 'Aqua',
      year: '2021',
      photo: '/images/cars/toyota/aqua/aqua-1.jpg',
    },
  ],
};

export const allSearchItems: SearchItem[] = [
  // бренды
  ...data.brands.map((b) => ({ value: b.name })),
  // бренд + модель
  ...data.brands.flatMap((b) =>
    b.marks.map((m) => ({ value: `${b.name} ${m.name}` })),
  ),
  // бренд + модель + конкретный год/вариант
  ...data.brands.flatMap((b) =>
    b.marks.flatMap((m) =>
      m.cars.map((c) => ({ value: `${b.name} ${m.name} ${c.name}` })),
    ),
  ),
];
