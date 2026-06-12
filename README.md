# ⚽ MS 2026 Tipovačka

Jednoduchá tipovacia liga na Majstrovstvá sveta vo futbale 2026 pre teba a kamošov.

- **Prihlásenie cez Google** + voľba prezývky
- **Tipovačka** – primárne vidíš zápasy aktuálneho týždňa, voliteľne aj ďalšie týždne
- **Tipovanie len výsledku** zápasu, s automatickým bodovaním
- **Rozpis** všetkých 104 zápasov MS 2026 (skupinová fáza s reálnymi tímami)
- **Poradie (leaderboard)** s kumulovanými bodmi
- **Tipy ostatných** sa odhalia 30 min pred zápasom (vtedy sa tipovanie zamkne)
- **Spätné doplnenie tipu** – ak hráč na zápas ešte nemá tip (napr. sa zaregistroval
  neskôr), môže ho doplniť aj po uzamknutí/odohraní zápasu; ak je zápas už
  ukončený, body sa započítajú hneď. Existujúci tip sa po uzamknutí už nedá meniť.
- **Admin modul** – prehľad hráčov, ich tipy a prihlásenia, skrytie z poradia, blokovanie, zadávanie výsledkov

## Stack

- **Backend:** Node.js + Express + Mongoose (MongoDB), Google OAuth (Passport), JWT cookie
- **Frontend:** React + Vite, servované cez nginx
- **DB:** MongoDB
- **Infra:** Docker + docker compose

```
WorldCup26/
├── docker-compose.yml
├── .env.example
├── server/        # Express API + Mongoose modely + seed
└── client/        # React (Vite) frontend
```

## Bodovanie

Tipuje sa iba výsledok zápasu. Za každý zápas dostaneš:

| Situácia | Body |
|---|---|
| **Presný výsledok** (oba tímy presne) | **3 b** |
| **Víťaz zápasu** (alebo remíza) správne | **1 b** |
| **Trafený počet gólov práve jedného tímu** | **1 b** |

- Presný výsledok = 3 b a **nič sa nepripočítava** (žiadny extra bod za góly).
- Body za víťaza a za góly jedného tímu sa **sčítavajú**.
- Príklad: tipuješ `2:1`, skončí `2:0` → víťaz (+1) + góly domácich trafené (+1) = **2 b**.
- Príklad: tipuješ `1:1`, skončí `2:1` → víťaz nie, góly hostí trafené (+1) = **1 b**.

(Logika: [`server/src/lib/scoring.js`](server/src/lib/scoring.js))

---

## 1. Príprava (Google OAuth)

1. Choď na <https://console.cloud.google.com> → **APIs & Services → Credentials**.
2. **Create OAuth client ID → Web application**.
3. Pridaj **Authorized redirect URI**:
   - Docker: `http://localhost:8080/api/auth/google/callback`
   - Lokálny vývoj: `http://localhost:4000/api/auth/google/callback`
4. Skopíruj **Client ID** a **Client secret**.
5. Skopíruj `.env.example` do `.env` a vyplň hodnoty:

```bash
cp .env.example .env
# vyplň GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, ADMIN_EMAILS
```

`ADMIN_EMAILS` = zoznam emailov (oddelený čiarkami), ktoré budú adminmi.

---

## 2. Spustenie cez Docker (odporúčané)

> Potrebuješ **Docker Desktop**. Na tomto PC zatiaľ nie je nainštalovaný — stiahni z
> <https://www.docker.com/products/docker-desktop/>.

```bash
docker compose up -d --build
```

Naseeduj zápasy do databázy (raz):

```bash
docker compose run --rm server npm run seed
```

Appka beží na **<http://localhost:8080>**.

Vypnutie: `docker compose down` (dáta ostanú vo volume `mongo-data`).

---

## 3. Spustenie lokálne (bez Dockera)

Potrebuješ **Node.js 20+** a bežiacu **MongoDB** (lokálne alebo Atlas).

**Backend:**

```bash
cd server
npm install
# nastav premenné (PowerShell):
#   $env:MONGO_URI="mongodb://localhost:27017/worldcup26"
#   $env:GOOGLE_CLIENT_ID="..."; $env:GOOGLE_CLIENT_SECRET="..."
#   $env:CLIENT_URL="http://localhost:5173"
#   $env:GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/google/callback"
#   $env:ADMIN_EMAILS="erik.macejko@gmail.com"
# alebo si vytvor server/.env (rovnaké kľúče)
npm run seed     # naplní zápasy
npm run dev      # API na http://localhost:4000
```

> Tip: backend načíta aj `server/.env` (cez dotenv), takže si tam môžeš dať
> `MONGO_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLIENT_URL=http://localhost:5173`,
> `GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback`, `ADMIN_EMAILS`.

**Frontend:**

```bash
cd client
npm install
npm run dev      # http://localhost:5173 (proxuje /api na :4000)
```

Otvor **<http://localhost:5173>**.

---

## Admin modul

Prihlás sa účtom, ktorého email je v `ADMIN_EMAILS`. V navigácii pribudne **Admin**:

- **Hráči** – zoznam so súčtom bodov a počtom tipov. Klik na hráča ukáže jeho email,
  históriu prihlásení a všetky jeho tipy. Tlačidlá:
  - **Skryť z poradia / Odkryť** – nezobrazí sa v leaderboarde.
  - **Zablokovať / Odblokovať** – nedokáže sa prihlásiť.
- **Výsledky** – zadáš skóre zápasu a body sa všetkým hráčom prepočítajú automaticky.

> Bez zadaných výsledkov sa body nepočítajú — výsledky musí zadať admin v sekcii *Výsledky*.

---

## Rozpis zápasov / seed

Reálny rozpis skupinovej fázy (po žrebe 5. 12. 2025) aj štruktúra vyraďovačky sú v
[`server/src/seed/matchData.js`](server/src/seed/matchData.js). Vyraďovacie zápasy majú
tímy ako `TBD` (doplníš ich neskôr). Po úprave súboru spusti znova `npm run seed` —
upsertne sa podľa čísla zápasu, **tvoje tipy ani výsledky sa nezmažú**.

Časy sú uložené v UTC a v appke sa zobrazujú v lokálnom čase prehliadača.
