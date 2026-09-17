import { lazy } from "react";
import { Navigate, createBrowserRouter, redirect } from "react-router";

import PortalShell from "./auth/PortalShell";
import { useAuth, homeFor } from "./auth/AuthContext";
import { PORTALS } from "./auth/portals";
import type { PortalId } from "./auth/portals";
import { utilityPage } from "./shared/components/UtilityFrame";

// The shared shell is what every visitor sees first, so it stays in the main
// chunk. Both portals are lazy: a farmer on a village connection should never
// download the hospital application, or vice versa. <PortalShell> owns the
// Suspense boundary that covers them.
import PublicLayout from "./shared/layouts/PublicLayout";
import Landing from "./shared/pages/Landing";
import About from "./shared/pages/About";
import HowItWorks from "./shared/pages/HowItWorks";
import Login from "./shared/pages/Login";
import Register from "./shared/pages/Register";
import Logout from "./shared/pages/Logout";
import NotFound from "./shared/pages/NotFound";

// Livestock Owner portal (was PawVita_Users) ---------------------------------
const FarmerLayout = lazy(() => import("./apps/user/layouts/FarmerLayout"));
const VetLayout = lazy(() => import("./apps/user/layouts/VetLayout"));
const UserOfficialLayout = lazy(() => import("./apps/user/layouts/OfficialLayout"));
const UserLabLayout = lazy(() => import("./apps/user/layouts/LabLayout"));
const UserAdminLayout = lazy(() => import("./apps/user/layouts/AdminLayout"));

const FarmerHome = lazy(() => import("./apps/user/pages/farmer/FarmerHome"));
const FarmerReportSymptom = lazy(() => import("./apps/user/pages/farmer/ReportSymptom"));
const FarmerMyAnimals = lazy(() => import("./apps/user/pages/farmer/MyAnimals"));
const FarmerAlerts = lazy(() => import("./apps/user/pages/farmer/Alerts"));
const FarmerCaseStatus = lazy(() => import("./apps/user/pages/farmer/CaseStatus"));
const FarmerVaccinationSchedule = lazy(
  () => import("./apps/user/pages/farmer/VaccinationSchedule"),
);

const VetDashboard = lazy(() => import("./apps/user/pages/vet/VetDashboard"));
const VetCaseDetail = lazy(() => import("./apps/user/pages/vet/CaseDetail"));
const VetFieldVisits = lazy(() => import("./apps/user/pages/vet/FieldVisits"));

const UserOverview = lazy(() => import("./apps/user/pages/official/Overview"));
const UserRiskMap = lazy(() => import("./apps/user/pages/official/RiskMap"));
const UserOutbreakClusters = lazy(() => import("./apps/user/pages/official/OutbreakClusters"));
const UserAnalytics = lazy(() => import("./apps/user/pages/official/Analytics"));
const UserReports = lazy(() => import("./apps/user/pages/official/Reports"));

const UserLabQueue = lazy(() => import("./apps/user/pages/lab/LabQueue"));
const UserSampleDetail = lazy(() => import("./apps/user/pages/lab/SampleDetail"));

const UserAdminUsers = lazy(() => import("./apps/user/pages/admin/Users"));
const UserAdminRegions = lazy(() => import("./apps/user/pages/admin/Regions"));
const UserSystemHealth = lazy(() => import("./apps/user/pages/admin/SystemHealth"));

const UserNotifications = lazy(() => import("./apps/user/pages/shared/Notifications"));
const UserSettings = lazy(() => import("./apps/user/pages/shared/Settings"));
const UserHelpSupport = lazy(() => import("./apps/user/pages/shared/HelpSupport"));

// Veterinary Hospital portal (was PawVita_Hospital) --------------------------
const WardLayout = lazy(() => import("./apps/hospital/layouts/HospitalLayout"));
const DoctorLayout = lazy(() => import("./apps/hospital/layouts/DoctorLayout"));
const HospOfficialLayout = lazy(() => import("./apps/hospital/layouts/OfficialLayout"));
const HospLabLayout = lazy(() => import("./apps/hospital/layouts/LabLayout"));
const HospAdminLayout = lazy(() => import("./apps/hospital/layouts/AdminLayout"));

const WardHome = lazy(() => import("./apps/hospital/pages/hospital/Home"));
const WardReportSymptom = lazy(() => import("./apps/hospital/pages/hospital/ReportSymptom"));
const WardMyAnimals = lazy(() => import("./apps/hospital/pages/hospital/MyAnimals"));
const WardAlerts = lazy(() => import("./apps/hospital/pages/hospital/Alerts"));
const WardCaseStatus = lazy(() => import("./apps/hospital/pages/hospital/CaseStatus"));
const WardVaccinationSchedule = lazy(
  () => import("./apps/hospital/pages/hospital/VaccinationSchedule"),
);

const DoctorDashboard = lazy(() => import("./apps/hospital/pages/doctor/Dashboard"));
const DoctorCase = lazy(() => import("./apps/hospital/pages/doctor/Case"));
const DoctorFieldVisits = lazy(() => import("./apps/hospital/pages/doctor/FieldVisits"));

const HospOverview = lazy(() => import("./apps/hospital/pages/official/Overview"));
const HospRiskMap = lazy(() => import("./apps/hospital/pages/official/RiskMap"));
const HospOutbreakClusters = lazy(() => import("./apps/hospital/pages/official/OutbreakClusters"));
const HospAnalytics = lazy(() => import("./apps/hospital/pages/official/Analytics"));
const HospReports = lazy(() => import("./apps/hospital/pages/official/Reports"));

const HospLabQueue = lazy(() => import("./apps/hospital/pages/lab/Queue"));
const HospLabSample = lazy(() => import("./apps/hospital/pages/lab/Sample"));

const HospAdminUsers = lazy(() => import("./apps/hospital/pages/admin/Users"));
const HospAdminRegions = lazy(() => import("./apps/hospital/pages/admin/Regions"));
const HospSystemHealth = lazy(() => import("./apps/hospital/pages/admin/SystemHealth"));

const HospNotifications = lazy(() => import("./apps/hospital/pages/shared/Notifications"));
const HospSettings = lazy(() => import("./apps/hospital/pages/shared/Settings"));
const HospHelpSupport = lazy(() => import("./apps/hospital/pages/shared/HelpSupport"));

/**
 * Landing route for a portal: send the signed-in visitor to the home screen of
 * whichever role they hold, rather than assuming the portal's default role.
 */
function PortalIndex({ portal }: { portal: PortalId }) {
  const { session } = useAuth();
  const target =
    session && session.portal === portal ? homeFor(session) : PORTALS[portal].roles[0].home;
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  // ---------------------------------------------------------------- public --
  {
    path: "/",
    Component: PublicLayout,
    children: [
      { index: true, Component: Landing },
      { path: "about", Component: About },
      { path: "how-it-works", Component: HowItWorks },
    ],
  },
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },
  // Both source apps linked to /signup; keep those links working.
  { path: "/signup", loader: () => redirect("/register") },
  { path: "/logout", Component: Logout },

  // ------------------------------------------------ Livestock Owner portal --
  {
    path: "/user",
    element: <PortalShell portal="user" />,
    children: [
      { index: true, element: <PortalIndex portal="user" /> },
      {
        path: "farmer",
        Component: FarmerLayout,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", Component: FarmerHome },
          { path: "report-symptom", Component: FarmerReportSymptom },
          { path: "my-animals", Component: FarmerMyAnimals },
          { path: "alerts", Component: FarmerAlerts },
          { path: "case-status/:id", Component: FarmerCaseStatus },
          { path: "vaccination-schedule", Component: FarmerVaccinationSchedule },
        ],
      },
      {
        path: "vet",
        Component: VetLayout,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", Component: VetDashboard },
          { path: "case/:id", Component: VetCaseDetail },
          { path: "field-visits", Component: VetFieldVisits },
        ],
      },
      {
        path: "official",
        Component: UserOfficialLayout,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", Component: UserOverview },
          { path: "risk-map", Component: UserRiskMap },
          { path: "outbreak-clusters", Component: UserOutbreakClusters },
          { path: "analytics", Component: UserAnalytics },
          { path: "reports", Component: UserReports },
        ],
      },
      {
        path: "lab",
        Component: UserLabLayout,
        children: [
          { index: true, element: <Navigate to="queue" replace /> },
          { path: "queue", Component: UserLabQueue },
          { path: "sample/:id", Component: UserSampleDetail },
        ],
      },
      {
        path: "admin",
        Component: UserAdminLayout,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: "users", Component: UserAdminUsers },
          { path: "regions", Component: UserAdminRegions },
          { path: "system-health", Component: UserSystemHealth },
        ],
      },
      { path: "notifications", Component: utilityPage(UserNotifications, "user") },
      { path: "settings", Component: utilityPage(UserSettings, "user") },
      { path: "help-support", Component: utilityPage(UserHelpSupport, "user") },
    ],
  },

  // -------------------------------------------- Veterinary Hospital portal --
  {
    path: "/hospital",
    element: <PortalShell portal="hospital" />,
    children: [
      { index: true, element: <PortalIndex portal="hospital" /> },
      {
        path: "ward",
        Component: WardLayout,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", Component: WardHome },
          { path: "report-symptom", Component: WardReportSymptom },
          { path: "my-animals", Component: WardMyAnimals },
          { path: "alerts", Component: WardAlerts },
          { path: "case-status/:id", Component: WardCaseStatus },
          { path: "vaccination-schedule", Component: WardVaccinationSchedule },
        ],
      },
      {
        path: "doctor",
        Component: DoctorLayout,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", Component: DoctorDashboard },
          { path: "case/:id", Component: DoctorCase },
          { path: "field-visits", Component: DoctorFieldVisits },
        ],
      },
      {
        path: "official",
        Component: HospOfficialLayout,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", Component: HospOverview },
          { path: "risk-map", Component: HospRiskMap },
          { path: "outbreak-clusters", Component: HospOutbreakClusters },
          { path: "analytics", Component: HospAnalytics },
          { path: "reports", Component: HospReports },
        ],
      },
      {
        path: "lab",
        Component: HospLabLayout,
        children: [
          { index: true, element: <Navigate to="queue" replace /> },
          { path: "queue", Component: HospLabQueue },
          { path: "sample/:id", Component: HospLabSample },
        ],
      },
      {
        path: "admin",
        Component: HospAdminLayout,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: "users", Component: HospAdminUsers },
          { path: "regions", Component: HospAdminRegions },
          { path: "system-health", Component: HospSystemHealth },
        ],
      },
      { path: "notifications", Component: utilityPage(HospNotifications, "hospital") },
      { path: "settings", Component: utilityPage(HospSettings, "hospital") },
      { path: "help-support", Component: utilityPage(HospHelpSupport, "hospital") },
    ],
  },

  { path: "*", Component: NotFound },
]);
