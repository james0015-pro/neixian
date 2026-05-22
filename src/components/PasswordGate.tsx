import { useState, useCallback, type FormEvent, type ReactNode } from 'react';

const AUTH_KEY = 'neixian_auth';
// Simple hash for beta password — not cryptographically secure, just keeps casuals out
const PASS_HASH = 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a'; // sha256("whale2026")

function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return crypto.subtle.digest('SHA-256', data).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  );
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === PASS_HASH);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;
      setChecking(true);
      setError(false);

      try {
        const hash = await sha256(password.trim());
        if (hash === PASS_HASH) {
          localStorage.setItem(AUTH_KEY, hash);
          setAuthed(true);
        } else {
          setError(true);
          setPassword('');
        }
      } catch {
        setError(true);
      }
      setChecking(false);
    },
    [password],
  );

  // Authenticated — render children
  if (authed) return <>{children}</>;

  // Password gate UI
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {/* Top decoration */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 28,
          background: '#0a0a0a',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
        }}
      >
        <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 12 }}>
          NEIXIAN ▸ 內線
        </span>
        <span style={{ color: '#555', fontSize: 9, marginLeft: 12 }}>
          INTERNAL USE ONLY
        </span>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 9 }}>
          {new Date().toISOString().slice(0, 10)}
        </span>
      </div>

      {/* Main gate */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '40px 48px',
          border: '1px solid #1f1f1f',
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#ff8c00',
            letterSpacing: 2,
          }}
        >
          內線 NEIXIAN
        </div>
        <div style={{ fontSize: 10, color: '#555', marginTop: -8 }}>
          INSIDER TRADE TRACKING ▸ BETA v0.2
        </div>

        <div
          style={{
            width: 320,
            height: 1,
            background: '#1f1f1f',
            margin: '8px 0',
          }}
        />

        <div style={{ fontSize: 9, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>
          Enter Access Code
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="········"
          autoFocus
          disabled={checking}
          style={{
            width: 280,
            padding: '10px 14px',
            background: '#000',
            border: `1px solid ${error ? '#ff3333' : '#333'}`,
            color: error ? '#ff3333' : '#ff8c00',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16,
            textAlign: 'center',
            letterSpacing: 4,
            outline: 'none',
          }}
        />

        {error && (
          <div
            style={{
              fontSize: 11,
              color: '#ff3333',
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            ACCESS DENIED
          </div>
        )}

        <button
          type="submit"
          disabled={checking || !password.trim()}
          style={{
            padding: '8px 32px',
            background: checking ? '#1a1a1a' : 'transparent',
            border: `1px solid ${checking ? '#333' : '#ff8c00'}`,
            color: checking ? '#555' : '#ff8c00',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            fontWeight: 600,
            cursor: checking ? 'default' : 'pointer',
            letterSpacing: 1,
          }}
        >
          {checking ? 'VERIFYING...' : 'ENTER'}
        </button>

        <div
          style={{
            fontSize: 8,
            color: '#444',
            marginTop: 12,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          BETA ACCESS ONLY ▸ CONTACT ADMIN FOR CODE
        </div>
      </form>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 20,
          background: '#0a0a0a',
          borderTop: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: 8,
          color: '#444',
        }}
      >
        <span>NEIXIAN ▸ BETA GATE</span>
        <span style={{ marginLeft: 'auto' }}>v0.2.0</span>
      </div>
    </div>
  );
}
