DB setup — Créer les tables et initialiser la base

1) Utiliser Prisma (recommandé)

- Assurez-vous d'avoir un fichier `.env` à la racine contenant `DATABASE_URL`.
- Installer dépendances et générer le client Prisma:

```bash
npm install
npx prisma generate
```

- Appliquer le schéma vers la base (sans migrations):

```bash
npx prisma db push
```

- Créer ensuite le compte administrateur par défaut:

```bash
npm run db:seed
```

- Ou faire les deux en une seule commande:

```bash
npm run db:setup
```

- Optionnel — créer une migration et l'appliquer (dev):

```bash
npx prisma migrate dev --name init
```

2) Ou exécuter le SQL directement (PostgreSQL)

- Si vous préférez exécuter un script SQL directement (psql), utilisez le fichier `db/create_tables.sql`.

```bash
# sous PowerShell
$env:DATABASE_URL = "postgresql://postgres:123456@localhost:5432/football_db"
psql $env:DATABASE_URL -f db/create_tables.sql
```

ou avec la CLI psql classique:

```bash
psql "postgresql://postgres:123456@localhost:5432/football_db" -f db/create_tables.sql
```

3) Peupler des comptes de test

- Le seed crée un administrateur par défaut avec les valeurs suivantes:

```text
Email: admin@info-sport.local
Mot de passe: Admin123!
Nom: Info Sport Admin
```

- Vous pouvez surcharger ces valeurs via les variables d'environnement `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_POSITION` et `DEFAULT_ADMIN_RATING`.

- Après avoir créé les tables, vous pouvez aussi utiliser le endpoint `/api/auth/register` pour créer des utilisateurs de test (voir README ou exemple ci-dessous):

```http
POST /api/auth/register
Content-Type: application/json

{ "email":"test@exemple.com", "password":"Password123!", "name":"Test" }
```

Notes
- Préférez `npx prisma db push` si vous utilisez Prisma: il synchronise le schéma Prisma avec la BDD automatiquement.
- Préférez `npm run db:setup` sur une base vide si vous voulez créer la structure et le compte admin en une seule étape.
- Si vous utilisez la commande `npx prisma generate`, assurez-vous que la version locale de `prisma` dans `package.json` est compatible avec votre schéma (v4.x si vous avez `url` dans `schema.prisma`).
- Le seed est idempotent: s'il trouve déjà l'email admin configuré, il garde le mot de passe existant et remet simplement le rôle `admin`.
