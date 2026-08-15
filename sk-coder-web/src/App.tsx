import { Switch, Route, Router as WouterRouter } from "wouter"
import IndexPage from "@/pages/Index"
import PrivacyPage from "@/pages/Privacy"
import TermsPage from "@/pages/Terms"
import GuidePage from "@/pages/Guide"
import NotFound from "@/pages/not-found"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function Router() {
  return (
    <Switch>
      <Route path="/" component={IndexPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/guide" component={GuidePage} />
      <Route component={NotFound} />
    </Switch>
  )
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

export default function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={BASE}>
        <Router />
      </WouterRouter>
    </ErrorBoundary>
  )
}
