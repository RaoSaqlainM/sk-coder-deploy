import { Switch, Route, Router as WouterRouter } from "wouter";
import IndexPage from "@/pages/Index";
import InformationPage from "@/pages/Information";
import AdminPage from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
function Router() {
    const ownerDashboardHost = import.meta.env.VITE_OWNER_DASHBOARD_HOST;
    const showOwnerDashboard = Boolean(ownerDashboardHost && window.location.hostname === ownerDashboardHost);
    return (<Switch>
      <Route path="/" component={IndexPage}/>
      <Route path="/guide"><InformationPage kind="guide"/></Route>
      <Route path="/privacy"><InformationPage kind="privacy"/></Route>
      <Route path="/terms"><InformationPage kind="terms"/></Route>
      {showOwnerDashboard ? <Route path="/admin" component={AdminPage}/> : null}
      <Route component={NotFound}/>
    </Switch>);
}
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
export default function App() {
    return (<ErrorBoundary>
      <WouterRouter base={BASE}>
        <Router />
      </WouterRouter>
    </ErrorBoundary>);
}
