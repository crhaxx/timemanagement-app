# Manager

Osobní time management: rychlý zápisník úkolů, backlog a přehled. Expo (SDK 58) + TypeScript, Expo Router a Supabase.

## Struktura

```text
src/app/_layout.tsx              Kořenový Stack
src/app/(tabs)/_layout.tsx       Nativní iOS tab bar
src/app/(tabs)/home/index.tsx    Přehled
src/app/(tabs)/goals/index.tsx   Dlouhodobé cíle
src/app/(tabs)/journal/index.tsx Denní deník
src/app/(tabs)/tasks/index.tsx   Úkoly (backlog)
src/app/new-task.tsx             Modál: nový úkol
src/app/new-goal.tsx             Modál: nový cíl
src/app/goal/[id].tsx            Modál: detail cíle
src/app/journal-edit.tsx         Modál: zápis do deníku
src/lib/supabase.ts          Supabase klient z EXPO_PUBLIC_* proměnných
src/types/database.ts        Typy tabulek tasks, goals a journal_entries
src/constants/colors.ts      iOS světlá paleta
supabase/schema.sql          Tabulky, indexy a RLS politiky
.env.example                 Vzor proměnných
```

Routy žijí v `src/app/`, protože tak je nastavená výchozí šablona Expo SDK 58 (`@/*` míří do `src/*`).

## Nastavení

1. V Supabase SQL editoru spusť `supabase/schema.sql`.
2. V kořeni projektu zkopíruj `.env.example` na `.env` a doplň hodnoty z **Project Settings → API**:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`EXPO_PUBLIC_` je povinná předpona. Expo ji vloží do klientského kódu, takže sem patří jen veřejný klíč (legacy **anon** key, nebo novější **publishable** key). Secret / `service_role` klíč do aplikace nepatří.

3. Nainstaluj závislosti a spusť aplikaci:

```bash
npm install
npx expo start
```

Po změně `.env` udělej v klientovi plný reload.

## Chování

- Záložka **Přehled** ukazuje počet otevřených úkolů, odhad času, důležité položky, cíle a rozpad podle kontextu.
- Záložka **Cíle** spravuje dlouhodobé cíle v `goals` (stav, termín, podcíle).
- Záložka **Deník** zapisuje jeden souhrn na den do `journal_entries`.
- Záložka **Přidat** je brain dump: uloží řádek se `status = 'backlog'`, volitelně navázaný na cíl.
- Seznam backlogu bere jen řádky se `status = 'backlog'`.
- **Hotovo** nastaví `status = 'done'` a položka ze seznamu zmizí.
- **Smazat** řádek odstraní. Potáhni seznam dolů pro obnovení ze Supabase.

Politiky v `schema.sql` pouští anon klíč ke všem řádkům. Hodí se to pro osobní nástroj. Než by data neměla být veřejná pro kohokoli s tím klíčem, přidej přihlášení a politiky zúž.
