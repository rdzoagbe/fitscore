import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import './Onboarding.css'

const roleOptions = [
  'IT Manager',
  'Service Delivery Manager',
  'Cloud / Infrastructure Manager',
  'Support Manager',
  'Business Applications Manager',
  'Data Center Manager',
  'Project / Delivery Manager',
  'Other'
]

const seniorityOptions = ['Junior', 'Mid-level', 'Senior', 'Lead / Manager', 'Director / Head of']
const goalOptions = ['Find a new job', 'Improve my CV', 'Prepare interviews', 'Track applications', 'Explore opportunities']
const marketOptions = ['France', 'UK', 'Europe', 'Remote', 'International']
const languageOptions = ['English', 'French', 'Both']

const tourSteps = [
  {
    icon: '🧭',
    kicker: 'Setup',
    title: 'Personalize your job-search workspace',
    desc: 'Tell Joblytics what kind of roles you are targeting so the dashboard, next actions, and career workflow feel relevant from the first session.'
  },
  {
    icon: '📄',
    kicker: 'CV Vault',
    title: 'Keep role-specific CV versions',
    desc: 'Store different versions of your CV and mark one as active before running ATS analysis.'
  },
  {
    icon: '🔎',
    kicker: 'Analysis',
    title: 'Analyze roles before applying',
    desc: 'Paste a job description, use your active CV, and get a practical match score with missing keywords and improvement actions.'
  },
  {
    icon: '🚀',
    kicker: 'Workflow',
    title: 'Move from analysis to application',
    desc: 'Generate cover letters, optimize LinkedIn, track applications, and prepare interview answers from the same workspace.'
  }
]

function PillGroup({ label, options, value, onChange }) {
  return (
    <div className="onbField">
      <label>{label}</label>
      <div className="onbPills">
        {options.map(option => (
          <button
            type="button"
            key={option}
            className={`onbPill ${value === option ? 'active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const { t } = useLang()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({
    targetRole: roleOptions[0],
    customRole: '',
    seniority: 'Lead / Manager',
    goal: 'Find a new job',
    market: 'France',
    language: 'Both'
  })

  const isProfileStep = step === 0
  const isLast = step === tourSteps.length - 1
  const current = tourSteps[step]

  const finalRole = useMemo(() => {
    if (profile.targetRole === 'Other') return profile.customRole.trim() || 'Other'
    return profile.targetRole
  }, [profile.targetRole, profile.customRole])

  const nextPage = useMemo(() => {
    if (profile.goal === 'Improve my CV') return 'coach'
    if (profile.goal === 'Track applications') return 'history'
    return 'analyzer'
  }, [profile.goal])

  const complete = async () => {
    setSaving(true)
    setError('')

    const payload = {
      onboarding_completed: true,
      target_role: finalRole,
      seniority_level: profile.seniority,
      job_search_goal: profile.goal,
      preferred_market: profile.market,
      preferred_language: profile.language,
      updated_at: new Date().toISOString()
    }

    try {
      if (user?.id) {
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({ user_id: user.id, ...payload }, { onConflict: 'user_id' })

        if (upsertError) {
          console.warn('Onboarding profile save failed:', upsertError.message)
          setError('Your setup was saved locally. Profile sync will retry later.')
        }
      }

      localStorage.setItem('fitscore_onboarded', 'true')
      localStorage.setItem('joblytics_onboarding_profile', JSON.stringify(payload))
      onDone?.({ nextPage, profile: payload })
    } catch (e) {
      console.warn('Onboarding completion failed:', e)
      localStorage.setItem('fitscore_onboarded', 'true')
      onDone?.({ nextPage, profile: payload })
    } finally {
      setSaving(false)
    }
  }

  const skip = () => {
    localStorage.setItem('fitscore_onboarded', 'true')
    onDone?.({ nextPage: 'dashboard', skipped: true })
  }

  return (
    <div className="onbOverlay" role="dialog" aria-modal="true" aria-label="Joblytics onboarding">
      <section className="onbShell">
        <div className="onbMain">
          <div className="onbTopline">
            <span>{current.kicker}</span>
            <button type="button" onClick={skip}>{t('onb_skip') || 'Skip for now'}</button>
          </div>

          <div className="onbIcon">{current.icon}</div>
          <h2>{current.title}</h2>
          <p className="onbDesc">{current.desc}</p>

          {isProfileStep ? (
            <div className="onbForm">
              <PillGroup
                label="Target role"
                options={roleOptions}
                value={profile.targetRole}
                onChange={targetRole => setProfile(p => ({ ...p, targetRole }))}
              />

              {profile.targetRole === 'Other' && (
                <div className="onbField">
                  <label>Custom role</label>
                  <input
                    value={profile.customRole}
                    onChange={e => setProfile(p => ({ ...p, customRole: e.target.value }))}
                    placeholder="Example: IT Operations Manager"
                  />
                </div>
              )}

              <PillGroup
                label="Seniority"
                options={seniorityOptions}
                value={profile.seniority}
                onChange={seniority => setProfile(p => ({ ...p, seniority }))}
              />

              <PillGroup
                label="Main goal"
                options={goalOptions}
                value={profile.goal}
                onChange={goal => setProfile(p => ({ ...p, goal }))}
              />

              <div className="onbGridTwo">
                <PillGroup
                  label="Target market"
                  options={marketOptions}
                  value={profile.market}
                  onChange={market => setProfile(p => ({ ...p, market }))}
                />
                <PillGroup
                  label="Preferred language"
                  options={languageOptions}
                  value={profile.language}
                  onChange={language => setProfile(p => ({ ...p, language }))}
                />
              </div>
            </div>
          ) : (
            <div className="onbFeatureGrid">
              {[
                ['ATS score', 'Know if the role is worth applying to.'],
                ['CV versions', 'Use the right CV for the right job.'],
                ['Cover letters', 'Generate and save tailored letters.'],
                ['Pipeline', 'Track applications through every status.']
              ].map(([title, copy]) => (
                <div key={title} className="onbFeatureCard">
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          )}

          {error && <p className="onbWarning">{error}</p>}

          <div className="onbProgressDots">
            {tourSteps.map((_, index) => (
              <button
                type="button"
                key={index}
                aria-label={`Go to onboarding step ${index + 1}`}
                className={index === step ? 'active' : ''}
                onClick={() => setStep(index)}
              />
            ))}
          </div>

          <div className="onbActions">
            <button type="button" className="onbSecondary" onClick={() => step > 0 ? setStep(s => s - 1) : skip()}>
              {step > 0 ? (t('onb_back') || 'Back') : (t('onb_skip') || 'Skip')}
            </button>
            <button
              type="button"
              className="onbPrimary"
              disabled={saving}
              onClick={() => isLast ? complete() : setStep(s => s + 1)}
            >
              {saving ? 'Saving...' : isLast ? 'Start my workflow' : (t('onb_next') || 'Next')}
            </button>
          </div>
        </div>

        <aside className="onbSide">
          <div className="onbScoreMock">
            <span>Workspace setup</span>
            <strong>{Math.min(100, 25 + step * 25)}%</strong>
            <div><em style={{ width: `${Math.min(100, 25 + step * 25)}%` }} /></div>
          </div>

          <div className="onbRoutePreview">
            <p>Your recommended start</p>
            <h3>{nextPage === 'coach' ? 'Open CV Coach' : nextPage === 'history' ? 'Open Application Board' : 'Run your first analysis'}</h3>
            <span>Based on your goal: {profile.goal}</span>
          </div>

          <div className="onbMiniList">
            {tourSteps.map((item, index) => (
              <div key={item.title} className={index <= step ? 'done' : ''}>
                <span>{index < step ? '✓' : index + 1}</span>
                <p>{item.title}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
