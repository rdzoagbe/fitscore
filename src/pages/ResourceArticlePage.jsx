import React from 'react'
import SeoHead from '../components/SeoHead'
import SeoConversionPanel from '../components/SeoConversionPanel'
import { getResourceBySlug, seoResources } from '../data/seoResources'
import './ResourcePages.css'

function FaqBlock({ items = [] }) {
  if (!items.length) return null
  return (
    <section className="resourceArticleSection">
      <h2>FAQ</h2>
      <div className="resourceFaqList">
        {items.map((item, index) => (
          <details key={index} className="resourceFaq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default function ResourceArticlePage({ slug }) {
  const article = getResourceBySlug(slug)

  if (!article) {
    return (
      <main className="resourcePage">
        <SeoHead
          title="Resource not found | Joblytics AI"
          description="This Joblytics AI resource could not be found. Browse all career resources."
          canonical="https://joblytics-ai.com/resources"
        />
        <section className="resourceHero resourceHeroSmall">
          <p className="resourceKicker">Resource not found</p>
          <h1>This guide does not exist yet.</h1>
          <p>Browse the full resource library for ATS, CV, LinkedIn, cover letter, and interview guidance.</p>
          <a href="/resources" className="resourcePrimaryCta">Back to resources</a>
        </section>
      </main>
    )
  }

  const canonical = `https://joblytics-ai.com/resources/${article.slug}`
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: canonical,
    author: { '@type': 'Organization', name: 'Joblytics AI' },
    publisher: { '@type': 'Organization', name: 'Joblytics AI' },
    mainEntityOfPage: canonical,
    keywords: article.keywords.join(', '),
    about: article.category,
    mainEntity: article.faq?.length ? article.faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) : undefined
  }

  return (
    <main className="resourcePage">
      <SeoHead
        title={`${article.title} | Joblytics AI`}
        description={article.description}
        canonical={canonical}
        type="article"
        jsonLd={articleJsonLd}
      />

      <article className="resourceArticle">
        <header className="resourceArticleHero">
          <a href="/resources" className="resourceBack">← Resources</a>
          <p className="resourceKicker">{article.category}</p>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
          <div className="resourceArticleMeta">
            <span>{article.readingTime}</span>
            <span>{article.keywords.slice(0, 3).join(' · ')}</span>
          </div>
          <div className="resourceHeroStat">
            <strong>{article.heroStat}</strong>
            <span>{article.heroStatLabel}</span>
          </div>
        </header>

        <div className="resourceArticleLayout">
          <aside className="resourceToc">
            <p>In this guide</p>
            {article.sections.map((section, index) => <a key={index} href={`#section-${index + 1}`}>{section.heading}</a>)}
            <a href="#faq">FAQ</a>
          </aside>

          <div className="resourceArticleBody">
            {article.sections.map((section, index) => (
              <section className="resourceArticleSection" id={`section-${index + 1}`} key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body && <p>{section.body}</p>}
                {section.bullets && (
                  <ul>
                    {section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}

            <section className="resourceCtaBox">
              <div>
                <p className="resourceKicker">Try it in Joblytics</p>
                <h2>Turn this guide into action.</h2>
                <p>Use Joblytics AI to analyze a role, improve your CV, create application assets, and keep your job search organized.</p>
              </div>
              <a href={article.ctaHref} className="resourcePrimaryCta">{article.ctaLabel}</a>
            </section>

            <SeoConversionPanel
              eyebrow="Apply this guide"
              title="Convert the advice into a practical application plan."
              description="Use the same workflow inside Joblytics: compare your CV to the job, identify proof gaps, create the cover letter, and prepare the interview kit."
              primaryHref={article.ctaHref}
              primaryLabel={article.ctaLabel}
              secondaryHref="/roles"
              secondaryLabel="Explore role-specific checkers"
              variant="compact"
            />

            <div id="faq">
              <FaqBlock items={article.faq} />
            </div>
          </div>
        </div>
      </article>

      <section className="resourceRelated">
        <h2>More resources</h2>
        <div className="resourceRelatedGrid">
          {seoResources.filter(item => item.slug !== article.slug).slice(0, 3).map(item => (
            <a href={`/resources/${item.slug}`} key={item.slug} className="resourceRelatedCard">
              <span>{item.category}</span>
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
