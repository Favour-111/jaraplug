import { SignIn, SignUp } from '@clerk/clerk-react'

export default function ClerkForms({ mode }: { mode: 'login' | 'register' }) {
  return mode === 'login'
    ? <SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/go" signUpForceRedirectUrl="/go" />
    : <SignUp routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/go" signInForceRedirectUrl="/go" />
}
