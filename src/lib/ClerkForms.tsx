import { SignIn, SignUp } from '@clerk/clerk-react'

/**
 * Flat, full-width layout for the auth pages: no card chrome, left-aligned header,
 * tall inputs and buttons. Colours come from the global dark theme in ClerkAuth.tsx.
 */
const flat = {
  layout: { logoPlacement: 'none' as const, socialButtonsPlacement: 'bottom' as const, socialButtonsVariant: 'blockButton' as const },
  elements: {
    rootBox: { width: '100%' },
    cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none', border: 'none', borderRadius: 0, background: 'transparent' },
    card: { width: '100%', padding: 0, gap: '1.5rem', boxShadow: 'none', border: 'none', background: 'transparent' },
    header: { alignItems: 'flex-start', textAlign: 'left', gap: '0.375rem' },
    headerTitle: { fontSize: '1.5rem', lineHeight: '1.9rem', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'left' },
    headerSubtitle: { fontSize: '0.90625rem', color: '#A1A1AA', textAlign: 'left' },
    main: { gap: '1.25rem' },
    form: { gap: '1.25rem' },
    formFieldLabel: { fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' },
    formFieldInput: {
      height: '3rem', padding: '0 1rem', fontSize: '0.90625rem', borderRadius: '0.75rem',
      backgroundColor: '#111111', border: '1px solid #292929', boxShadow: 'none',
      '&::placeholder': { color: '#6b6b72' },
      '&:focus': { borderColor: 'rgba(255,23,68,0.7)', boxShadow: '0 0 0 3px rgba(255,23,68,0.18)' },
    },
    formButtonPrimary: {
      height: '3rem', fontSize: '0.90625rem', fontWeight: 600, borderRadius: '0.75rem', textTransform: 'none',
      background: 'linear-gradient(180deg, #ff1744 0%, #d90429 100%)', boxShadow: '0 10px 30px -10px rgba(255,23,68,0.55)', border: 'none',
      '&:hover': { filter: 'brightness(1.1)' },
      '&:focus': { boxShadow: '0 0 0 3px rgba(255,23,68,0.3)' },
    },
    dividerRow: { margin: '0.25rem 0' },
    dividerText: { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A1A1AA' },
    socialButtons: { gap: '0.75rem' },
    socialButtonsBlockButton: {
      height: '3rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#171717', boxShadow: 'none',
      '&:hover': { backgroundColor: '#222222' },
    },
    socialButtonsBlockButtonText: { fontSize: '0.90625rem', fontWeight: 600, color: '#ffffff' },
    lastAuthenticationStrategyBadge: { backgroundColor: '#080808', color: '#A1A1AA', border: '1px solid #292929' },
    footer: { background: 'transparent', padding: 0, marginTop: '0.5rem', '& > div': { justifyContent: 'center', background: 'transparent', borderTop: 'none' } },
    footerAction: { justifyContent: 'center', padding: '0.25rem 0' },
    footerActionText: { fontSize: '0.8125rem', color: '#A1A1AA' },
    footerActionLink: { fontSize: '0.8125rem', fontWeight: 600, color: '#FF1744', '&:hover': { color: '#ff4569' } },
    otpCodeFieldInput: { height: '3rem', borderRadius: '0.75rem', backgroundColor: '#111111', borderColor: '#292929' },
    identityPreview: { backgroundColor: '#111111', border: '1px solid #292929', borderRadius: '0.75rem', justifyContent: 'flex-start' },
    backLink: { color: '#A1A1AA' },
  },
}

export default function ClerkForms({ mode }: { mode: 'login' | 'register' }) {
  return mode === 'login'
    ? <SignIn appearance={flat} routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/go" signUpForceRedirectUrl="/go" />
    : <SignUp appearance={flat} routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/go" signInForceRedirectUrl="/go" />
}
