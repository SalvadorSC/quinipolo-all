# Team pictures status

Summary of which waterpolo teams have a logo image (`teams.image_name` / `teams_logos/`) and which are missing.

- **Source of truth for “has picture”:** migration `20250227_add_teams_image_name.sql` (only waterpolo).
- **Full team list:** `PAST PLANS/waterpolo_teams.csv` (waterpolo only). Names can differ slightly from DB (e.g. spacing, dots).

---

## Teams WITH picture (77 team names)

These team names are updated in the migration and have a file in `teams_logos/`:

- A.E. Santa Eulàlia F
- A.N. Brescia
- A.R. Concepción Ciudad Lineal F / M
- Apollon Smyrnis M
- C.C Ciudad de Alcorcon F / M
- C.N. Badia M
- C. Las Encinas De Boadilla M
- C.N. Boadilla F / M
- C.N. Caballa M
- C.N. Catalunya F / M
- C.N. Ciutat de Palma F / M, Ciutat de Palma M
- C.N. Atlètic-Barceloneta F / M
- C.N. Barcelona F / M
- C.N. Cuatro Caminos F
- C. Waterpolo Dos Hermanas F / M
- C.N. Echeyde B M, Echeyde F / M
- C. Waterpolo Elx F / M
- C.N. Godella F / M
- C.N. Granollers F / M
- C.N. Helios M
- C.N. Las Palmas M
- C.D. Waterpolo Malaga F / M
- C.N. Marseille M, Marsella
- C.N. Mataró F / M
- C.E. Mediterrani F / M
- C.N. Metropole M
- C.N. Molins de Rei F / M
- C.N. Montjuïc F / M
- C.C. Napoli
- C. Waterpolo Navarra M, Navarra B
- C. Waterpolo Pontevedra F
- C.N. Poble Nou F / M
- C.N. Premià M
- C.N. Rubí F / M
- C.N. Sabadell F / M
- C.N. Sant Feliu F / M
- C.N Sant Andreu F / M, C.N. Sant Andreu F / M, C.N Sant Andreu M (incl. variants)
- C.N. Terrassa F / M, Terrassa (incl. variants)
- C.D. Waterpolo Turia F / M
- C.N Manresa M
- U.E Horta F / M
- C.N. Vallirana F / M
- C. Waterpolo Sevilla F / M

**Logo files in `teams_logos/`:** 36 distinct filenames (e.g. `sabadell.png`, `mataro.svg`, `sanfe.webp`). One team name can share one logo.

---

## Teams WITHOUT picture (missing – 116 names)

Use this list to add new logos and then set `teams.image_name` (and add a row in a future migration if needed).

| # | Team name |
|---|-----------|
| 1 | A.S Roma F |
| 2 | Alcaraz |
| 3 | Alemania |
| 4 | Alimos F |
| 5 | Askartza B |
| 6 | Askartza F |
| 7 | C.D Ciudad de Rivas F |
| 8 | C.N Montjuïc F |
| 9 | C.N Montjuïc M |
| 10 | C.N. Tres Cantos M |
| 11 | CS Plebiscito Padova F |
| 12 | CSA Steaua Bucarest M |
| 13 | Claret Askartza M |
| 14 | Croacia F |
| 15 | D.N Portugalete M |
| 16 | DINAMARCA (balonmano) |
| 17 | De Akker Bolonia |
| 18 | Dinamarca/Islandia |
| 19 | Djokovic |
| 20 | Donosti |
| 21 | Dunaujvaros F |
| 22 | E. Waterpolo Zaragoza F |
| 23 | ESLOVAQUIA |
| 24 | ESPAÑA |
| 25 | ESPAÑA (balonmano) |
| 26 | Eger F |
| 27 | Ekipe Orizzonte F |
| 28 | España F |
| 29 | Estrella Roja |
| 30 | Ferencvarosi |
| 31 | Ferencvárosi T.C. F |
| 32 | Ferencvárosi T.C. M |
| 33 | FRANCIA |
| 34 | Francia |
| 35 | Francia F |
| 36 | GEORGIA |
| 37 | Gran Bretaña F |
| 38 | GRECIA |
| 39 | Grecia F |
| 40 | Hannover |
| 41 | Holanda F |
| 42 | Honved SE |
| 43 | Hungria |
| 44 | HUNGRIA |
| 45 | Hungria F |
| 46 | ISRAEL |
| 47 | ITALIA |
| 48 | Italia F |
| 49 | Jadran NH |
| 50 | Jadran ST |
| 51 | KVK Radnički Kragujevac M |
| 52 | Larraina |
| 53 | Leioa (and variants: Leioa , Leioa  F, Leioa Waterpolo F) |
| 54 | MONTENEGRO |
| 55 | Mladost |
| 56 | Nancy F |
| 57 | Nautica Portugalete |
| 58 | Nautica Portugalete B |
| 59 | Olimpic Roma |
| 60 | Olympiacos F |
| 61 | Olympiacos M |
| 62 | Oradea |
| 63 | Orizzonte Catania F |
| 64 | Ortigia |
| 65 | Paises Bajos |
| 66 | PAISES BAJOS |
| 67 | Paises Bajos F |
| 68 | Panathinaikos Waterpolo C. M |
| 69 | Panionios Waterpolo C. F |
| 70 | Panionios Waterpolo C. M |
| 71 | Partizan |
| 72 | Portugal F |
| 73 | Posilipo |
| 74 | Pozuelo |
| 75 | Primorac |
| 76 | Primorac Kotor |
| 77 | Pro Recco Waterpolo |
| 78 | Radnicki |
| 79 | Rapallo F |
| 80 | Rari Nantes Savona M |
| 81 | Real Canoe N.C. 2 M |
| 82 | Real Canoe N.C. F |
| 83 | Real Canoe N.C. M |
| 84 | Roma F |
| 85 | Roma Vis Nova |
| 86 | RUMANIA |
| 87 | Rumania F |
| 88 | Sabac |
| 89 | SAN Giljan ASC |
| 90 | SC Quinto M |
| 91 | Serbia |
| 92 | SERBIA (and variant SERBIA ) |
| 93 | Telimar Pallanuoto M |
| 94 | Trieste |
| 95 | Trieste F |
| 96 | UPNA |
| 97 | UPNA F |
| 98 | URBAT IKE |
| 99 | UVSE F |
| 100 | Unión Waterpolo Tenerife M |
| 101 | Vasas |
| 102 | Vk Novi Beograd |
| 103 | Vouliagmeni F |
| 104 | W.P.C. Dinamo Tblisi M |
| 105 | Waterpolo Brains F |
| 106 | Waterpolo Brains M |
| 107 | Waterpolo Ciudad de Rivas F |
| 108 | Waterpolo Iruña 9802 F |
| 109 | ZV de ZAAN F |
| 110 | cata |
| 111 | dos |
| 112 | mata |

(Some CSV rows are duplicates or test-like names; you may skip “cata”, “dos”, “mata” when prioritizing.)

---

## How to add a new team picture

1. Add the image file under `quinipolo-be/teams_logos/` (e.g. `olympacos.png`). Prefer PNG/WebP, reasonable size.
2. In the DB, set `teams.image_name` to that filename for the right team(s), e.g.:
   - `UPDATE public.teams SET image_name = 'olympacos.png' WHERE sport = 'waterpolo' AND name IN ('Olympiacos F', 'Olympiacos M');`
3. Optionally add that `UPDATE` to a new migration so the change is versioned.

To regenerate this list after DB or CSV changes, you can re-run a script that parses the migration and CSV and diffs by team name (as in the script used to build this file).
