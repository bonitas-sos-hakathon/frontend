# Intégration Supabase — Latino Impact

Le frontend conserve les composants, styles, couleurs, pages et navigation d'origine. Les données fonctionnelles (profils, thèmes, quiz, questions, propositions, tentatives, résultats et conseil quotidien) sont maintenant récupérées via Supabase et les Edge Functions.

## 1. Configuration du frontend

Créer `frontend/.env.local` :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE
```

Le fichier `src/lib/supabaseClient.js` est exactement configuré avec ces deux variables. La clé `service_role` ne doit jamais être placée dans le frontend.

## 2. Base de données

Le fichier `supabase/schema.sql` est remplacé par le SQL fourni pour ce projet. Il crée les tables `parents`, `children`, `child_sessions`, `themes`, `quizzes`, `questions`, `question_options`, `question_answer_keys`, `quiz_attempts`, `child_answers` et `parenting_tips`, ainsi que les politiques RLS et les données initiales.

Exécuter ce fichier dans Supabase SQL Editor si les tables ne sont pas déjà créées. Si le schéma a déjà été exécuté, ne relancez pas aveuglément le script complet : certaines commandes `CREATE TABLE` ne sont pas idempotentes.

## 3. Déployer les Edge Functions

Les fonctions se trouvent dans `supabase/functions/`. Le fichier `supabase/config.toml` désactive le contrôle JWT de la passerelle pour que les fonctions puissent aussi recevoir le jeton personnalisé `x-child-session`. Les fonctions parent vérifient elles-mêmes le JWT Supabase avec `getParent()` et les fonctions enfant vérifient elles-mêmes le jeton enfant avec `getChild()`.

Ajouter la clé secrète côté Supabase uniquement :

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY
```

`SUPABASE_URL` est fourni automatiquement par l'environnement Edge.

Depuis le dossier `frontend` :

```bash
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase functions deploy
```

La fonction additionnelle `parent-open-child` a été ajoutée pour permettre au parent d'ouvrir l'espace enfant sans connaître le PIN. Elle vérifie la propriété du profil et crée une session enfant temporaire de deux heures.

## 4. Lancer le frontend

```bash
npm install
npm run dev
```

Redémarrer Vite après avoir créé ou modifié `.env.local`.

## 5. Flux intégrés

### Parent
- Inscription : `parent-register`, puis `parent-login` pour créer la session Auth côté navigateur.
- Connexion : `parent-login`.
- Chargement du tableau de bord et des enfants : `get-parent-dashboard`.
- Ajout, modification et désactivation : `create-child`, `update-child`, `delete-child`.
- Rapport : `get-child-report`.
- Conseil quotidien : `get-daily-parenting-tip`.
- Ouverture de l'espace enfant : `parent-open-child`.

### Enfant
- Connexion par CIN du parent et PIN : `child-login`. Si plusieurs profils correspondent au même PIN, l'interface demande de choisir le profil.
- Thèmes et quiz : `get-available-quizzes`.
- Démarrage/reprise : `start-quiz`, `get-quiz-questions`, `resume-quiz`.
- Sauvegarde de chaque réponse : `save-answer`.
- Finalisation et calcul du score : `complete-quiz`.
- Déconnexion : `child-logout`.

Les bonnes réponses ne sont plus présentes dans le fichier React des quiz et ne sont pas renvoyées à l'enfant pendant le test. Elles sont consultées côté serveur par `save-answer`, et le détail des bonnes réponses n'est fourni que par `get-child-report` après authentification du parent.

## 6. Limites connues du schéma fourni

- La table `quiz_attempts` ne contient pas de durée. La statistique de temps reste donc à zéro jusqu'à l'ajout d'une colonne de durée et à son alimentation.
- Le PIN de l'enfant est limité à quatre chiffres dans le formulaire actuel. Le backend accepte de 4 à 6 chiffres.
- Les conseils affichés viennent de la table `parenting_tips`. Le texte de départ dans le SQL fourni est en français ; si le contenu doit être en arabe, il faut remplacer les valeurs de ces enregistrements dans Supabase.
- Il faut prévoir une limitation des tentatives de connexion enfant côté serveur : un PIN court ne doit pas être exposé à des essais illimités.
