# Mammouth pour n8n

<a href="https://mammouth.ai/">
  <img src="https://mammouth.ai/logos/mammouth-ai-logo.png" alt="Mammouth AI — site officiel" width="200">
</a>

**[Découvrir Mammouth AI](https://mammouth.ai/)**

Nodes communautaires pour utiliser [Mammouth AI](https://mammouth.ai/) (ou toute API
compatible avec le protocole OpenAI) dans n8n. Le package contient deux nodes :

- **Mammouth** : node d'action (Chat, Image, Text) à placer dans un workflow.
- **Mammouth Chat Model** : sous-node « Chat Model » à brancher sur un **AI Agent**
  ou une **Chain** n8n.

Open Source : https://github.com/mammouth-ai/n8n-integration

## Installation du package publié

Le package npm est disponible sous le nom
[`n8n-nodes-mammouth`](https://www.npmjs.com/package/n8n-nodes-mammouth).

Sur une instance n8n auto-hébergée autorisant les nodes communautaires :

1. Ouvrir **Settings → Community Nodes → Install**.
2. Saisir `n8n-nodes-mammouth` et confirmer l'installation.
3. Créer les credentials **Mammouth API** décrits ci-dessous.
4. Ajouter le node **Mammouth** à un workflow.

La compilation depuis les sources ci-dessous est une alternative pour le
développement ou le chargement comme extension personnalisée.

## Compilation et vérification

Node.js 24 ou supérieur et npm sont nécessaires (une dépendance du SDK n8n
exige Node.js 24). Respecter également la version
Node.js requise par votre installation n8n. Le paquet est compilé et testé avec
`n8n-workflow` 2.42.1 ; la compatibilité avec votre version exacte de n8n reste
à vérifier sur votre instance.

Les exemples supposent que le projet se trouve dans `$HOME/n8n-integration`.
`$HOME` désigne le répertoire personnel de l'utilisateur courant ; adapter le
chemin à l'emplacement de votre copie du projet.

```bash
cd "$HOME/n8n-integration"
npm ci
npm test
```

La compilation produit `$HOME/n8n-integration/dist`,
avec le node, ses credentials, ses icônes et ses métadonnées.

## Chargement dans n8n installé avec npm / Node.js

Sur la machine qui exécute n8n, après compilation, définir le répertoire
d'extensions personnalisées au démarrage :

```bash
export N8N_CUSTOM_EXTENSIONS="$HOME/n8n-integration/dist"
n8n start
```

Arrêter préalablement l'instance existante : ne pas lancer un deuxième processus
sur le même port. Si n8n est géré par systemd ou PM2, ajouter cette variable à
la configuration de ce service, puis le redémarrer avec son gestionnaire.
Un simple `export` dans un terminal ne modifie pas l'environnement d'un service.

- Exécuter n8n avec son utilisateur habituel pour conserver ses données.
- Le chemin ci-dessus est un exemple : l'adapter si n8n tourne ailleurs.
- Dans la configuration d'un service, utiliser le chemin absolu réel si `$HOME`
  n'est pas développé par le gestionnaire de services.
- Conserver les dépendances installées dans ce projet et rendre le projet lisible
  par l'utilisateur du service n8n.
- Si `N8N_CUSTOM_EXTENSIONS` contient déjà des chemins, ajouter ce répertoire en
  les séparant par `;`, sans supprimer les extensions existantes.
- Recompiler puis redémarrer n8n après chaque modification.
- Recharger l'interface et chercher **Mammouth** dans le sélecteur de nodes.

Le chargement comme extension personnalisée ne nécessite pas de publication npm.
`npm pack` produit aussi une archive installable pour un déploiement en paquet
communautaire. Ne pas charger simultanément le même node comme extension
personnalisée et comme paquet communautaire ; leurs identifiants de workflow
diffèrent (`CUSTOM.mammouth` et `n8n-nodes-mammouth.mammouth`).

## Configuration de l'API

Créer des credentials **Mammouth API** et renseigner :

- **API Base URL** : `https://api.mammouth.ai/v1` pour l'API Mammouth officielle.
  Pour une API compatible OpenAI hébergée ailleurs, saisir son URL de base
  complète, avec son préfixe de version si nécessaire.
- **API Key** : clé envoyée dans `Authorization: Bearer …`, disponible dans votre
  compte Mammouth, dans les paramètres de l'API sur
  [mammouth.ai](https://mammouth.ai/). La clé est stockée dans les credentials
  n8n et ne doit pas être écrite dans un champ du workflow.

Le bouton de test des credentials appelle
`GET https://api.mammouth.ai/v1/models` pour vérifier la clé et l'accès à l'API.

## Exemple : node Mammouth (réponse à un message)

1. Ajoutez un node **Edit Fields** et créez ces champs :

   ```json
   {
     "name": "Camille",
     "message": "Est-ce que je peux déplacer mon rendez-vous à vendredi ?"
   }
   ```

2. Reliez-le à un node **Mammouth**, puis choisissez **Chat → Send Message**.
3. Sélectionnez les credentials **Mammouth API** ci-dessus et un modèle proposé
   par la liste de modèles.
4. Ajoutez deux messages :
   - **Instructions (System)** : `Tu es un assistant de support. Réponds en français et reste concis.`
   - **User** : `Réponds à {{ $json.name }} : {{ $json.message }}`
5. Exécutez le workflow. Avec **Return Only the Reply** activé, la réponse est
   accessible dans `message.content` de la sortie du node.

## Exemple : node Mammouth Chat Model avec un AI Agent

1. Ajoutez un **Chat Trigger** et reliez-le à l'entrée principale d'un **AI Agent**.
2. Ajoutez un **Mammouth Chat Model**, sélectionnez les mêmes credentials
   **Mammouth API**, puis choisissez un modèle disponible.
3. Reliez la sortie **Model** du sous-node à l'entrée **Chat Model** de l'AI Agent.
4. Dans l'AI Agent, utilisez `{{ $json.chatInput }}` comme prompt utilisateur.
   Dans le Chat Trigger, envoyez par exemple : « Donne-moi trois idées de repas
   végétariens rapides. »
5. Lancez le workflow et consultez la réponse de l'AI Agent. Le Mammouth Chat
   Model fournit le modèle de langage à l'agent; il ne se relie pas à la sortie
   principale du workflow.

## Quelle opération choisir ?

| Je veux… | Ressource → Opération |
| --- | --- |
| Générer un texte (email, résumé, traduction, réponse client, extraction de données…) | **Chat → Send Message** |
| Analyser un email avec toutes ses images jointes | **Image → Analyze** |
| Décrire, lire ou comparer une ou plusieurs images | **Image → Analyze** |
| Créer une image à partir d'une description | **Image → Generate** |
| Vérifier si un texte contient des propos haineux, violents, sexuels… | **Text → Check Content Safety** |
| Corriger ou reformuler un texte selon une consigne | **Chat → Send Message** (ou **Text → Edit** si l'API le supporte) |
| Utiliser Mammouth comme cerveau d'un AI Agent | node **Mammouth Chat Model** |

**En cas de doute, utiliser Chat → Send Message** : c'est l'opération la plus
polyvalente et la mieux supportée.

### Chat → Send Message

Envoie une conversation à un modèle et renvoie sa réponse. Chaque message a un
émetteur (**From**) :

- **Instructions (System)** : consigne générale (rôle, ton, langue, format).
  Exemple : « Tu es un agent du support client, réponds en français, en 5 lignes maximum. »
- **User** : la demande. Exemple : `Réponds à cet email : {{ $json.text }}`.
- **AI (Assistant)** : une réponse précédente du modèle, pour reprendre une conversation.

Penser à augmenter **Maximum Response Length** dans les options : la valeur par
défaut (16 tokens, environ 60 caractères) coupe la plupart des réponses.

### Image → Analyze

Envoie en une seule requête un texte **et plusieurs images** à un modèle capable de
lire les images (GPT-4o, Claude, Gemini…). Cas typique : un email et ses pièces jointes.

1. En amont, un node qui lit les emails (Gmail, IMAP…) avec le téléchargement des
   pièces jointes activé.
2. **Instruction / Text** : `Résume cet email et ses pièces jointes : {{ $json.text }}`.
3. **Images to Send** :
   - **All Images From Previous Node** : toutes les images de l'item (les PDF et
     autres fichiers sont ignorés).
   - **Specific Files** : seulement les champs listés (`attachment_0, attachment_1`).
   - **Image URLs** : des liens publics, séparés par des virgules.
   - **No Image (Text Only)** : texte seul.
4. Options utiles : **Image Detail Level** (`Low` coûte moins cher, `High` est
   nécessaire pour lire du petit texte ou une facture), **Maximum Answer Length**
   (300 tokens par défaut), **Model Instructions**.

La réponse se trouve dans le champ `content`.

### Image → Generate

Crée une ou plusieurs images à partir d'une description. **Return Image As** :
**File** (prêt à joindre à un email ou à téléverser) ou **Image URL** (lien temporaire).

### Text (avancé)

Opérations historiques, moins utiles au quotidien :

- **Continue** : le modèle *continue* le texte donné (autocomplétion). Il ne suit
  pas d'instruction : « Cher client, suite à votre commande » fonctionne,
  « Écris un email » beaucoup moins. Pour demander un texte, utiliser Chat.
- **Edit** : réécrit un texte selon une consigne. Nécessite l'endpoint `/edits`,
  rarement disponible ; Chat fait la même chose.
- **Check Content Safety** (modération) : **ne génère pas de texte**. Indique si un
  texte contient de la haine, du harcèlement, de la violence, du contenu sexuel ou
  d'automutilation, catégorie par catégorie. Utile pour filtrer des messages
  d'utilisateurs avant d'y répondre. Nécessite un modèle de modération
  (ex. `omni-moderation-latest`), pas un modèle de chat.

### Options communes (Chat et Text)

| Option | Effet |
| --- | --- |
| Creativity (Temperature) | Bas = réponses précises et constantes ; haut = plus variées |
| Word Choice Diversity (Top P) | Restreint le vocabulaire aux mots les plus probables ; modifier ceci **ou** la température |
| Avoid Repetition (Frequency Penalty) | Réduit les répétitions de mots et de phrases |
| Encourage New Topics (Presence Penalty) | Pousse le modèle à aborder de nouveaux sujets |
| Maximum Response Length (Tokens) | Longueur maximale de la réponse (1 token ≈ 4 caractères) |
| Number of Replies / Results | Nombre de variantes générées (chacune consomme des tokens) |

Les noms techniques des paramètres sont inchangés : les workflows existants
continuent de fonctionner malgré les nouveaux libellés.

## Endpoints et limites

Les chemins suivants sont ajoutés à l'URL de base :

| Fonction | Méthode et chemin |
| --- | --- |
| Liste des modèles et test des credentials | `GET /models` |
| Chat et analyse d'images | `POST /chat/completions` |
| Génération d'image | `POST /images/generations` |
| Complétion texte | `POST /completions` |
| Édition texte | `POST /edits` |
| Modération | `POST /moderations` |

La liste des modèles attend `{ "data": [{ "id": "identifiant-du-modele" }] }`.
Elle n'applique aucun filtre de marque : choisir un modèle compatible avec
l'opération. L'édition et la modération demandent un identifiant saisi manuellement.

Les opérations et options sont héritées du node d'origine. Une compatibilité
Chat Completions ne garantit pas les endpoints historiques d'édition, de texte,
de modération, ni les paramètres image. Les options spécifiques DALL-E restent
conditionnées à ces modèles. Seules les fonctions effectivement exposées par
votre API pourront fonctionner ; aucun support supplémentaire n'est présumé.

Les tests vérifient la compilation, les exports, les assets, les expressions n8n,
l'authentification, les modèles et les erreurs HTTP. Un serveur HTTP local simule
les endpoints modèles et chat à partir de la configuration du node ; ce test
ne remplace pas une exécution du moteur de routage n8n ni un appel à votre API.

## Licence et marques

Le package déclare la licence MIT. Vérifier également les obligations de licence
et d'attribution du code amont avant toute redistribution.

Le nom et le logo Mammouth appartiennent à leurs titulaires respectifs. Le lien
vers le site officiel ne constitue pas une certification de cette intégration.