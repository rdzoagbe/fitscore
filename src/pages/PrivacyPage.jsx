import React from 'react'

export default function PrivacyPage({ onBack }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, marginBottom: 28, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Retour
        </button>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: '#f0f0f0', marginBottom: 6 }}>
          Politique de confidentialité & RGPD
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 36 }}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        {[
          {
            title: '1. Responsable du traitement',
            content: `FitScore est édité en tant que service personnel. En utilisant FitScore, vous acceptez la collecte et l'utilisation de vos données telles que décrites dans cette politique.`
          },
          {
            title: '2. Données collectées',
            content: `Nous collectons uniquement les données nécessaires au fonctionnement du service :\n\n• Adresse email (pour la création de compte)\n• Fichiers CV uploadés (PDF ou Word) — stockés de façon sécurisée\n• URLs des offres d'emploi analysées\n• Résultats des analyses ATS\n• Données de connexion (date, heure)`
          },
          {
            title: '3. Finalité du traitement',
            content: `Vos données sont utilisées exclusivement pour :\n\n• Vous fournir le service d'analyse ATS\n• Stocker votre historique d'analyses\n• Améliorer le service\n\nVos données ne sont jamais vendues, partagées ou utilisées à des fins publicitaires.`
          },
          {
            title: '4. Base légale (RGPD Art. 6)',
            content: `Le traitement de vos données est fondé sur :\n\n• L'exécution du contrat (fourniture du service)\n• Votre consentement explicite lors de l'inscription`
          },
          {
            title: '5. Durée de conservation',
            content: `• Données de compte : conservées jusqu'à suppression du compte\n• Fichiers CV : conservés jusqu'à suppression manuelle ou suppression du compte\n• Historique d'analyses : conservé jusqu'à suppression manuelle ou du compte\n\nEn cas de suppression de compte, toutes les données associées sont supprimées dans un délai de 30 jours.`
          },
          {
            title: '6. Sous-traitants',
            content: `Nous utilisons les sous-traitants suivants, tous conformes au RGPD :\n\n• Supabase (stockage des données) — serveurs en Europe\n• Anthropic (analyse IA) — traitement à la volée, aucune donnée conservée\n• Vercel (hébergement) — infrastructure sécurisée`
          },
          {
            title: '7. Vos droits (RGPD)',
            content: `Conformément au RGPD, vous disposez des droits suivants :\n\n• Droit d'accès à vos données\n• Droit de rectification\n• Droit à l'effacement (droit à l'oubli)\n• Droit à la portabilité\n• Droit d'opposition au traitement\n\nPour exercer ces droits, supprimez votre compte depuis l'application ou contactez-nous.`
          },
          {
            title: '8. Sécurité',
            content: `Vos données sont protégées par :\n\n• Chiffrement en transit (HTTPS/TLS)\n• Chiffrement au repos (Supabase)\n• Authentification sécurisée\n• Accès aux données strictement limité à votre compte`
          },
          {
            title: '9. Cookies',
            content: `FitScore utilise uniquement des cookies techniques nécessaires au fonctionnement du service (session d'authentification). Aucun cookie publicitaire ou de tracking n'est utilisé.`
          },
          {
            title: '10. Contact & réclamations',
            content: `Pour toute question relative à vos données personnelles, vous pouvez contacter le responsable du traitement via l'application.\n\nVous avez également le droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).`
          }
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 600, color: '#c8f542', marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
