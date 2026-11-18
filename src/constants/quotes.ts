/**
 * When a quote is shown:
 * - `start`: something is still waiting to be done today
 * - `done`: it is done, keep the standard
 * - `comeback`: the streak broke, get back on it
 * - `build`: setting a routine up
 */
export type QuoteMood = 'start' | 'done' | 'comeback' | 'build';

export type Quote = {
  text: string;
  author: string;
  moods: readonly QuoteMood[];
};

/**
 * Real quotes only, translated to Czech. A few lines stay in English because
 * that is how they are known. Add or drop entries freely; nothing else depends
 * on their order.
 */
export const QUOTES: readonly Quote[] = [
  // David Goggins
  {
    text: 'Nepřestávej, když jsi unavený. Přestaň, až budeš hotový.',
    author: 'David Goggins',
    moods: ['start'],
  },
  {
    text: 'Motivace je k ničemu. Přichází a odchází. Když jsi hnaný vpřed, zničíš všechno, co ti stojí v cestě.',
    author: 'David Goggins',
    moods: ['start'],
  },
  {
    text: 'Nikoho nezajímá, co jsi udělal včera. Co jsi udělal dnes, abys byl lepší?',
    author: 'David Goggins',
    moods: ['start', 'done'],
  },
  {
    text: 'Když si myslíš, že jsi hotový, jsi teprve na 40 % toho, co tvoje tělo dokáže.',
    author: 'David Goggins',
    moods: ['start'],
  },
  {
    text: 'Hrozí ti, že budeš žít život tak pohodlný a měkký, že zemřeš, aniž poznáš svůj skutečný potenciál.',
    author: 'David Goggins',
    moods: ['start', 'comeback'],
  },
  {
    text: 'Nejdůležitější rozhovory, které kdy povedeš, jsou ty, které vedeš sám se sebou.',
    author: 'David Goggins',
    moods: ['start', 'comeback'],
  },
  {
    text: 'Who’s gonna carry the boats?',
    author: 'David Goggins',
    moods: ['start'],
  },
  {
    text: 'Je to mnohem víc než síla vůle. Chce to neúprosnou sebekázeň, aby sis utrpení naplánoval do každého dne.',
    author: 'David Goggins',
    moods: ['start', 'build'],
  },
  {
    text: 'Na mozku si musíš vypěstovat mozoly, stejně jako si je pěstuješ na rukou.',
    author: 'David Goggins',
    moods: ['done'],
  },
  {
    text: 'Buď neobyčejný mezi neobyčejnými.',
    author: 'David Goggins',
    moods: ['done'],
  },
  {
    text: 'Stay hard.',
    author: 'David Goggins',
    moods: ['done'],
  },
  {
    text: 'Popírání je ta nejpohodlnější komfortní zóna.',
    author: 'David Goggins',
    moods: ['comeback'],
  },

  // Jocko Willink
  {
    text: 'Disciplína rovná se svoboda.',
    author: 'Jocko Willink',
    moods: ['start', 'done', 'build'],
  },
  {
    text: 'Nečekej, že budeš motivovaný každý den. Nebudeš. Nespoléhej na motivaci. Spoléhej na disciplínu.',
    author: 'Jocko Willink',
    moods: ['start', 'comeback'],
  },

  // James Clear
  {
    text: 'Nestoupáš na úroveň svých cílů. Klesáš na úroveň svých systémů.',
    author: 'James Clear',
    moods: ['start', 'build'],
  },
  {
    text: 'Každý čin je hlasem pro člověka, kterým se chceš stát.',
    author: 'James Clear',
    moods: ['done', 'build'],
  },
  {
    text: 'Návyky jsou složeným úročením seberozvoje.',
    author: 'James Clear',
    moods: ['done', 'build'],
  },
  {
    text: 'Vynechat jednou je nehoda. Vynechat dvakrát je začátek nového zvyku.',
    author: 'James Clear',
    moods: ['comeback'],
  },

  // Stoics
  {
    text: 'Co stojí v cestě, stává se cestou.',
    author: 'Marcus Aurelius',
    moods: ['start', 'comeback'],
  },
  {
    text: 'Nemarni už čas řečmi o tom, jaký má být dobrý člověk. Buď jím.',
    author: 'Marcus Aurelius',
    moods: ['start'],
  },
  {
    text: 'Když se ti ráno nechce vstávat, řekni si: vstávám, abych konal dílo člověka.',
    author: 'Marcus Aurelius',
    moods: ['start'],
  },
  {
    text: 'Není pravda, že máme málo času. Jen ho hodně promarníme.',
    author: 'Seneca',
    moods: ['start'],
  },
  {
    text: 'Častěji trpíme v představách než ve skutečnosti.',
    author: 'Seneca',
    moods: ['start'],
  },
  {
    text: 'Nejdřív si řekni, kým chceš být. Potom dělej, co je třeba.',
    author: 'Epiktétos',
    moods: ['start', 'build'],
  },

  // Athletes
  {
    text: 'Nesnášel jsem každou minutu tréninku. Ale říkal jsem si: nevzdávej to. Trp teď a zbytek života prožij jako šampion.',
    author: 'Muhammad Ali',
    moods: ['start'],
  },
  {
    text: 'Odpočívej na konci, ne uprostřed.',
    author: 'Kobe Bryant',
    moods: ['start'],
  },
  {
    text: 'Poslední tři čtyři opakování jsou to, co nutí sval růst. Tahle oblast bolesti odděluje šampiona od toho, kdo šampionem není.',
    author: 'Arnold Schwarzenegger',
    moods: ['start'],
  },
  {
    text: 'Když nemůžeš, tak přidej.',
    author: 'Emil Zátopek',
    moods: ['start'],
  },
  {
    text: 'Nebojím se toho, kdo trénoval deset tisíc kopů jednou. Bojím se toho, kdo trénoval jeden kop desettisíckrát.',
    author: 'Bruce Lee',
    moods: ['done', 'build'],
  },
  {
    text: 'V životě jsem selhal znovu a znovu a znovu. A právě proto jsem uspěl.',
    author: 'Michael Jordan',
    moods: ['comeback'],
  },

  // Others
  {
    text: 'Jsme to, co opakovaně děláme. Dokonalost tedy není čin, ale zvyk.',
    author: 'Will Durant',
    moods: ['done', 'build'],
  },
  {
    text: 'Disciplína je most mezi cíli a jejich dosažením.',
    author: 'Jim Rohn',
    moods: ['done', 'build'],
  },
  {
    text: 'Všichni musíme snést jednu ze dvou bolestí: bolest disciplíny, nebo bolest lítosti.',
    author: 'Jim Rohn',
    moods: ['start', 'comeback'],
  },
  {
    text: 'Kdo má proč žít, snese téměř každé jak.',
    author: 'Friedrich Nietzsche',
    moods: ['start', 'comeback'],
  },
  {
    text: 'Cesta dlouhá tisíc mil začíná jedním krokem.',
    author: 'Lao-c’',
    moods: ['build', 'comeback'],
  },
];

const BY_MOOD: Record<QuoteMood, Quote[]> = { start: [], done: [], comeback: [], build: [] };
for (const quote of QUOTES) {
  for (const mood of quote.moods) BY_MOOD[mood].push(quote);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/**
 * The same seed always yields the same quote, so it stays put across re-renders
 * and changes only when the seed does (a new day, another routine). `offset`
 * steps through the rest of the pool.
 */
export function pickQuote(mood: QuoteMood, seed: string, offset = 0): Quote {
  const pool = BY_MOOD[mood];
  return pool[(hash(`${mood}:${seed}`) + offset) % pool.length];
}
