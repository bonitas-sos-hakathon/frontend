# Latino Impact — واجهة المنصة (React + Vite)

Interface 100 % arabe, RTL natif (`lang="ar" dir="rtl"`), reproduisant les maquettes Figma fournies :
accueil, fenêtre de connexion, espace mère (أطفالي، التقدّم، بطاقات اليوم، أثرنا الجماعي, profil d'un enfant)
et espace enfant (3 domaines, 2 niveaux chacun, quiz avec retour immédiat et explications).

## Lancer

```bash
npm install
npm run dev
```

Sans configuration, l'application tourne en **mode démo** (données dans le navigateur) :

| Espace | Identifiant | Secret |
| --- | --- | --- |
| Mère | `07234567` | `12345678` |
| Enfant (سارة) | `LI-24018` | `1234` |
| Enfant (آدم) | `LI-24019` | `5678` |

## Utiliser Supabase (données réelles)

1. Supabase > Authentication > Providers > Email : **désactiver « Confirm email »**.
2. Supabase > SQL Editor : exécuter `supabase/schema.sql`.
3. Copier `.env.example` en `.env` et renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.

Fonctionnement :
- **Mère** : compte Supabase Auth (e-mail technique `<carte-id>@parents.latinoimpact.app`), inscription possible depuis la fenêtre de connexion.
- **Enfant** : identifiant `LI-xxxxx` + code à 4 chiffres (haché côté base), vérifiés par les fonctions `child_login` / `record_attempt`.
- Les tentatives de quiz sont enregistrées dans `quiz_attempts` ; les points sont ajoutés par un trigger ; la sécurité par lignes (RLS) limite chaque mère à ses enfants.
- À prévoir avant la production : limitation des essais sur `child_login` (code à 4 chiffres).

## Structure

- `src/data/content.js` : tous les textes arabes de l'interface.
- `src/data/quizzes.js` : domaines, niveaux, questions et explications (à modifier librement).
- `src/data/advice.js` : cartes éducatives du jour.
- `src/lib/` : routeur, authentification, API (`supabaseApi.js` / `demoApi.js`), statistiques.
- `src/pages/` : accueil, espace mère (`parent/`), espace enfant (`child/`).
- `src/index.css` : charte (marine / cyan / corail) et composants.
