import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { RequireAuth } from './lib/guards'
import { PublicLayout } from './layouts/PublicLayout'
import { AdminLayout, ClientLayout, ProviderLayout } from './layouts/Layouts'
import { Welcome } from './pages/Welcome'
// TEMPORARILY unused: import { Landing } from './pages/Landing' (swap it back in at "/" to restore the marketing page)
import { AuthPage, GoHome } from './pages/Auth'
import { Guidelines, Privacy, Terms } from './pages/Legal'
import { ClientDiscover, PublicDiscover } from './pages/Discover'
import { ProviderProfilePage } from './pages/ProviderProfile'
import { Onboarding } from './pages/Onboarding'
import { VerifyPage } from './pages/Verify'
import { MessagesPage } from './pages/Messages'
import { BookingRequestPage } from './pages/Booking'
import { BookingsPage } from './pages/Bookings'
import { ClientProfilePage, LibraryPage, PurchasesPage, SavedPage } from './pages/ClientPages'
import { SettingsPage } from './pages/Settings'
import { CreditsPage } from './pages/Credits'
import { CheckoutResult, UnlockPage, WatchPage } from './pages/Unlock'
import { ProviderDashboard } from './pages/provider/Dashboard'
import { ProviderProfileEditor } from './pages/provider/ProfileEditor'
import { ProviderContentPage, UploadContentPage } from './pages/provider/Content'
import { ProviderBookingsPage } from './pages/provider/Bookings'
import { EarningsPage } from './pages/provider/Earnings'
import { AdminAudit, AdminContent, AdminReferrals, AdminOverview, AdminReports, AdminSupport, AdminTransactions, AdminUsers, AdminVerifications } from './pages/admin/Admin'
import { EmptyState } from './components/ui'
import { Link } from 'react-router-dom'
import { API_BASE } from './lib/api'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const NotFound = () => <div className="mx-auto max-w-md px-4 py-24"><EmptyState title="Page not found" text="That page doesn't exist." action={<Link to="/" className="btn-primary">Back home</Link>} /></div>

/** Remembers a referral code from any link like /?ref=ABCD2345 until the visitor finishes signing up. */
function ReferralCapture() {
  const { search } = useLocation()
  useEffect(() => {
    const ref = new URLSearchParams(search).get('ref')?.trim().toUpperCase()
    if (ref && /^[A-Z0-9]{4,16}$/.test(ref)) { try { localStorage.setItem('jp_ref', ref) } catch { /* */ } }
  }, [search])
  return null
}

/** Anonymous visit counter: one tiny request per page view, no cookies or ids kept on the device. Admin screens are not counted. */
let lastTracked = { path: '', at: 0 }
function VisitTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    const now = Date.now()
    if (lastTracked.path === pathname && now - lastTracked.at < 2000) return // React StrictMode runs effects twice in dev
    lastTracked = { path: pathname, at: now }
    fetch(`${API_BASE}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {})
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <VisitTracker />
      <ReferralCapture />
      <ScrollTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route element={<PublicLayout />}>
          <Route path="/discover" element={<PublicDiscover />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/community-guidelines" element={<Guidelines />} />
        </Route>
        <Route path="/login/*" element={<AuthPage mode="login" />} />
        <Route path="/register/*" element={<AuthPage mode="register" />} />
        <Route path="/profile/:username" element={<ProviderProfilePage />} />
        <Route path="/unlock/:id" element={<UnlockPage />} />
        <Route path="/watch/:id" element={<WatchPage />} />

        {/* Signed-in, any role */}
        <Route element={<RequireAuth allowUnonboarded />}>
          <Route path="/go" element={<GoHome />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/checkout/result/:reference" element={<CheckoutResult />} />
        </Route>
        <Route element={<RequireAuth roles={['CLIENT']} />}>
          <Route path="/book/:username" element={<BookingRequestPage />} />
        </Route>

        {/* Client */}
        <Route element={<RequireAuth roles={['CLIENT']} />}>
          <Route path="/app" element={<ClientLayout />}>
            <Route index element={<Navigate to="discover" replace />} />
            <Route path="discover" element={<ClientDiscover />} />
            <Route path="credits" element={<CreditsPage />} />
            <Route path="messages" element={<MessagesPage base="/app/messages" />} />
            <Route path="messages/:conversationId" element={<MessagesPage base="/app/messages" />} />
            <Route path="bookings" element={<BookingsPage as="client" />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="content" element={<LibraryPage />} />
            <Route path="profile" element={<ClientProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
          </Route>
        </Route>

        {/* Provider */}
        <Route element={<RequireAuth roles={['PROVIDER']} />}>
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ProviderDashboard />} />
            <Route path="profile" element={<ProviderProfileEditor />} />
            <Route path="content" element={<ProviderContentPage />} />
            <Route path="content/upload" element={<UploadContentPage />} />
            <Route path="messages" element={<MessagesPage base="/provider/messages" />} />
            <Route path="messages/:conversationId" element={<MessagesPage base="/provider/messages" />} />
            <Route path="bookings" element={<ProviderBookingsPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
