# MaCaisse - Solution ERP Moderne & IA

MaCaisse est une plateforme de gestion commerciale (ERP) de nouvelle génération conçue pour les PME et les commerces modernes. Elle combine une gestion rigoureuse des stocks et des ventes avec la puissance de l'intelligence artificielle (Gemini 3 Flash) pour transformer les données en décisions stratégiques.

## 🚀 Fonctionnalités Clés

- **Tableau de Bord Intelligent** : Visualisation en temps réel des performances (CA, ventes, produits phares).
- **Gestion des Stocks & Fournisseurs** : Suivi précis des inventaires, alertes de stock bas et gestion des relations fournisseurs.
- **Point de Vente (POS)** : Interface fluide pour enregistrer les ventes et générer des factures.
- **Insights IA (Gemini)** : Analyse automatique des tendances de vente et recommandations de croissance personnalisées.
- **Multi-Boutiques & Rôles** : Gestion centralisée de plusieurs points de vente avec des accès sécurisés (Admin, Gérant, Employé).
- **Architecture Cloud** : Basé sur Firebase pour une synchronisation en temps réel et une sécurité maximale.

## 🎨 Identité Visuelle

- **Style** : Clean Utility / Professional Dashboard.
- **Couleurs** : Indigo profond, Blanc pur, Gris ardoise (Slate), Emeraude pour les indicateurs de succès.
- **Typographie** : Inter (Sans-serif) pour la clarté, JetBrains Mono pour les données techniques.
- **Animations** : Transitions fluides avec Framer Motion pour une expérience utilisateur premium.

---

## 🎬 PROMPT POUR GÉNÉRATION DE VIDÉO PUBLICITAIRE (AI VIDEO PROMPT)

*Copiez-collez ce texte dans un générateur de vidéo IA (Sora, Veo, Kling, Runway Gen-3) pour créer votre publicité.*

### Version Française (Optimisée pour le contexte) :
> "Une vidéo publicitaire cinématographique de 30 secondes pour 'MaCaisse', une application ERP moderne. 
> La vidéo commence par un commerçant stressé devant des piles de papiers et des stocks désorganisés. Transition fluide vers une interface numérique élégante et lumineuse sur une tablette : c'est MaCaisse. 
> On voit des graphiques de ventes qui montent (Indigo et Emeraude), des icônes de produits qui s'organisent d'un simple clic. 
> Gros plan sur une fonctionnalité 'IA Insights' où une notification apparaît : 'Analyse Gemini : Augmentez votre stock de café de 20% pour la semaine prochaine'. 
> Le commerçant sourit, l'ambiance devient sereine et professionnelle. 
> Style visuel : Éclairage studio, haute définition 4K, esthétique Apple-like, minimaliste et technologique. 
> Texte à l'écran : 'Gérez. Analysez. Grandissez. MaCaisse : L'IA au service de votre commerce.'"

### English Version (Optimized for AI Models) :
> "A 30-second cinematic commercial for 'MaCaisse', a modern ERP application. 
> The video starts with a stressed business owner overwhelmed by paperwork and messy inventory. Smooth transition to a sleek, glowing digital interface on a tablet: MaCaisse. 
> Show rising sales charts (Indigo and Emerald colors), product icons organizing themselves with a tap. 
> Close-up on an 'AI Insights' feature where a notification pops up: 'Gemini Analysis: Increase coffee stock by 20% for next week'. 
> The owner smiles, the atmosphere becomes calm and professional. 
> Visual Style: Studio lighting, 4K high definition, Apple-esque aesthetic, minimalist and high-tech. 
> On-screen text: 'Manage. Analyze. Grow. MaCaisse: AI for your business.'"

---

## 🛠️ Installation Technique

1. Clonez le dépôt.
2. Installez les dépendances : `npm install`.
3. Configurez les variables d'environnement dans `.env` (voir `.env.example`).
4. Lancez le serveur de développement : `npm run dev`.

## 🔒 Sécurité & Firebase

L'application utilise Firebase Authentication et Firestore avec des règles de sécurité strictes définies dans `firestore.rules`. Assurez-vous de déployer les règles avant la mise en production.
