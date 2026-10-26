import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { useEffect, useMemo, type Context, type ReactNode } from 'react'
import { setTokenGetter } from './api'
import { CLERK_KEY, type AuthState } from './auth'

function Bridge({ AuthCtx, children }: { AuthCtx: Context<AuthState>; children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth()
  setTokenGetter(async () => (isSignedIn ? getToken() : null))
  useEffect(() => { setTokenGetter(async () => (isSignedIn ? getToken() : null)) }, [isSignedIn, getToken])
  const value = useMemo<AuthState>(() => ({
    status: !isLoaded ? 'loading' : isSignedIn ? 'signedIn' : 'signedOut',
    userKey: isLoaded && isSignedIn ? (userId ?? null) : null,
    signOut: async () => { await signOut() },
    devSignIn: () => {},
  }), [isLoaded, isSignedIn, userId, signOut])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

// Dark theme tokens. colorNeutral=white is what flips Clerk's derived greys/borders/button text to light-on-dark.
const appearance = {
  variables: {
    colorPrimary: '#FF1744', colorBackground: '#111111', colorText: '#ffffff', colorTextSecondary: '#A1A1AA',
    colorInputBackground: '#080808', colorInputText: '#ffffff', colorNeutral: '#ffffff', colorTextOnPrimaryBackground: '#ffffff',
  },
  elements: {
    socialButtonsBlockButton: { backgroundColor: '#171717', border: '1px solid #3a3a3a', '&:hover': { backgroundColor: '#222222' } },
    socialButtonsBlockButtonText: { color: '#ffffff', fontWeight: 600 },
    dividerLine: { backgroundColor: '#292929' },
    dividerText: { color: '#A1A1AA' },
    formFieldLabel: { color: '#E4E4E7' },
    footerActionText: { color: '#A1A1AA' },
    footerActionLink: { color: '#FF1744' },
    identityPreviewText: { color: '#ffffff' },
    identityPreviewEditButton: { color: '#FF1744' },
    formResendCodeLink: { color: '#FF1744' },
    otpCodeFieldInput: { color: '#ffffff', borderColor: '#3a3a3a' },
  },
}

/** Clerk-backed authentication. Loaded lazily so dev builds without a Clerk key never ship it. */
export default function ClerkAuth({ AuthCtx, children }: { AuthCtx: Context<AuthState>; children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} appearance={appearance}>
      <Bridge AuthCtx={AuthCtx}>{children}</Bridge>
    </ClerkProvider>
  )
}
