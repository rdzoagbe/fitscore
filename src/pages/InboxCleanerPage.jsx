import { useState } from 'react';

const MOCK_SUBSCRIPTIONS = [
  {
    id: 1,
    sender: 'Spotify',
    email: 'marketing@spotify.com',
    category: 'Marketing',
    frequency: 'Weekly',
    lastReceived: '2 days ago',
    totalEmails: 47,
    logoColor: '#1DB954',
    logoInitial: 'S',
  },
  {
    id: 2,
    sender: 'The New York Times',
    email: 'newsletter@nytimes.com',
    category: 'Newsletter',
    frequency: 'Daily',
    lastReceived: 'Today',
    totalEmails: 312,
    logoColor: '#000000',
    logoInitial: 'N',
  },
  {
    id: 3,
    sender: 'LinkedIn',
    email: 'notifications@linkedin.com',
    category: 'Social',
    frequency: '3x/week',
    lastReceived: 'Yesterday',
    totalEmails: 89,
    logoColor: '#0A66C2',
    logoInitial: 'in',
  },
  {
    id: 4,
    sender: 'Substack',
    email: 'digest@substack.com',
    category: 'Newsletter',
    frequency: 'Weekly',
    lastReceived: '5 days ago',
    totalEmails: 28,
    logoColor: '#FF6719',
    logoInitial: 'S',
  },
  {
    id: 5,
    sender: 'Amazon',
    email: 'deals@amazon.com',
    category: 'Promotions',
    frequency: 'Daily',
    lastReceived: 'Today',
    totalEmails: 204,
    logoColor: '#FF9900',
    logoInitial: 'A',
  },
  {
    id: 6,
    sender: 'Medium',
    email: 'noreply@medium.com',
    category: 'Newsletter',
    frequency: '2x/week',
    lastReceived: '3 days ago',
    totalEmails: 61,
    logoColor: '#000000',
    logoInitial: 'M',
  },
];

const FREE_LIMIT = 5;

const CATEGORY_COLORS = {
  Marketing: { bg: 'rgba(164,81,43,0.11)', text: '#A4512B' },
  Newsletter: { bg: 'rgba(67,85,111,0.10)', text: '#43556F' },
  Social: { bg: 'rgba(63,111,80,0.11)', text: '#3F6F50' },
  Promotions: { bg: 'rgba(143,100,31,0.11)', text: '#8F641F' },
};

function PaywallModal({ onClose, onUpgrade }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(16,24,43,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: 'clamp(24px,5vw,40px)',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(16,24,43,0.18)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'rgba(164,81,43,0.11)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 24,
        }}>🔒</div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px,4vw,26px)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>Unlock Bulk Unsubscribe</h2>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
          You've used your 5 free unsubscribes. Upgrade once to bulk-remove
          all unwanted senders — forever.
        </p>

        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>✓ Unlimited unsubscribes</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>✓ One-click bulk select & remove</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>✓ Scan new emails automatically</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 'clamp(28px,5vw,36px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}>$10</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14, marginLeft: 6 }}>one-time · no subscription</span>
        </div>

        <button
          onClick={onUpgrade}
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          Unlock for $10 →
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

function ConfirmToast({ sender, action }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--text-primary)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 500,
      zIndex: 100,
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(16,24,43,0.22)',
    }}>
      {action === 'unsubscribe' ? '🗑 Unsubscribed from' : '✓ Keeping'} <strong>{sender}</strong>
    </div>
  );
}

export default function InboxCleanerPage() {
  const [subscriptions, setSubscriptions] = useState(MOCK_SUBSCRIPTIONS);
  const [selected, setSelected] = useState(new Set());
  const [unsubscribedCount, setUnsubscribedCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('All');
  const [upgraded, setUpgraded] = useState(false);

  const showToast = (sender, action) => {
    setToast({ sender, action });
    setTimeout(() => setToast(null), 2500);
  };

  const handleUnsubscribe = (id, senderName) => {
    if (!upgraded && unsubscribedCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    setUnsubscribedCount(c => c + 1);
    showToast(senderName, 'unsubscribe');
  };

  const handleKeep = (id, senderName) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    showToast(senderName, 'keep');
  };

  const handleBulkUnsubscribe = () => {
    if (!upgraded && unsubscribedCount + selected.size > FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    const names = subscriptions.filter(s => selected.has(s.id)).map(s => s.sender);
    setSubscriptions(prev => prev.filter(s => !selected.has(s.id)));
    setUnsubscribedCount(c => c + selected.size);
    setSelected(new Set());
    showToast(`${names.length} senders`, 'unsubscribe');
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  const categories = ['All', ...Array.from(new Set(MOCK_SUBSCRIPTIONS.map(s => s.category)))];
  const filtered = filter === 'All' ? subscriptions : subscriptions.filter(s => s.category === filter);

  const freeRemaining = Math.max(0, FREE_LIMIT - unsubscribedCount);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="logo">Inbox<span className="acc">Clean</span></div>
          <div className="tagline">EMAIL SUBSCRIPTION MANAGER</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(63,111,80,0.11)',
            color: '#3F6F50',
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3F6F50', display: 'inline-block' }} />
            Gmail connected
          </div>
          {!upgraded && (
            <div style={{
              background: 'rgba(164,81,43,0.11)',
              color: 'var(--accent)',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {freeRemaining} free left
            </div>
          )}
        </div>
      </div>

      <div className="page-main">

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          {[
            { label: 'Subscriptions found', value: MOCK_SUBSCRIPTIONS.length, icon: '📬' },
            { label: 'Unsubscribed', value: unsubscribedCount, icon: '🗑' },
            { label: 'Emails/month saved', value: unsubscribedCount * 14, icon: '⚡' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px,4vw,28px)',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
        }}>
          {/* Category filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: filter === cat ? 'var(--accent)' : 'var(--border)',
                  background: filter === cat ? 'var(--accent)' : 'transparent',
                  color: filter === cat ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Bulk action */}
          {selected.size > 0 && (
            <button
              onClick={handleBulkUnsubscribe}
              style={{
                padding: '8px 16px',
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🗑 Unsubscribe {selected.size} selected
            </button>
          )}
        </div>

        {/* Free tier progress */}
        {!upgraded && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Free plan — {freeRemaining} unsubscribe{freeRemaining !== 1 ? 's' : ''} remaining
              </span>
              <button
                onClick={() => setShowPaywall(true)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Unlock all →
              </button>
            </div>
            <div style={{
              height: 6,
              background: 'var(--border)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(unsubscribedCount / FREE_LIMIT) * 100}%`,
                background: freeRemaining === 0 ? 'var(--red)' : 'var(--accent)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 100px 90px 80px 180px',
            gap: 8,
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={filtered.length > 0 && selected.size === filtered.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>
            {['Sender', 'Category', 'Frequency', 'Emails', 'Actions'].map(h => (
              <div key={h} style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}>
              🎉 All clean in this category!
            </div>
          ) : (
            filtered.map((sub, idx) => (
              <div
                key={sub.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 100px 90px 80px 180px',
                  gap: 8,
                  padding: '14px 18px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  background: selected.has(sub.id) ? 'rgba(164,81,43,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(sub.id)}
                  onChange={() => toggleSelect(sub.id)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                />

                {/* Sender */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: sub.logoColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: sub.logoInitial.length > 1 ? 10 : 14,
                    fontWeight: 800,
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                  }}>
                    {sub.logoInitial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{sub.sender}</div>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{sub.email}</div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: CATEGORY_COLORS[sub.category]?.bg,
                    color: CATEGORY_COLORS[sub.category]?.text,
                  }}>
                    {sub.category}
                  </span>
                </div>

                {/* Frequency */}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {sub.frequency}
                </div>

                {/* Total */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: sub.totalEmails > 100 ? 'var(--red)' : 'var(--text-primary)',
                }}>
                  {sub.totalEmails}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleUnsubscribe(sub.id, sub.sender)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(169,71,64,0.10)',
                      color: 'var(--red)',
                      border: '1px solid rgba(169,71,64,0.2)',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Unsubscribe
                  </button>
                  <button
                    onClick={() => handleKeep(sub.id, sub.sender)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Keep
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: 16,
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Scanned 2,341 emails · Last scan: just now ·{' '}
          <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            Re-scan inbox
          </button>
        </p>
      </div>

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUpgrade={() => {
            setUpgraded(true);
            setShowPaywall(false);
            showToast('Premium', 'keep');
          }}
        />
      )}

      {toast && <ConfirmToast sender={toast.sender} action={toast.action} />}
    </div>
  );
}
