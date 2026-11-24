import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import MessengerPage from "./pages/MessengerPage";
import TicketsPage from "./pages/TicketsPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import RaiseTicketPage from "./pages/RaiseTicketPage";
import AgentManagementPage from "./pages/AgentManagementPage";
import UserManagementPage from "./pages/UserManagementPage";
import SettingsPage from "./pages/SettingsPage";
import AssetsPage from "./pages/AssetsPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import { ProtectedRoute } from "./auth/ProtectedRoute";


export const router = createBrowserRouter([
  // Public routes
  { path: "/", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },

  // Any logged-in user (admin, agent, or end user)
  {
    Component: ProtectedRoute,
    children: [
      { path: "/dashboard", Component: DashboardPage },
      { path: "/messenger", Component: MessengerPage },
      { path: "/my-tickets", Component: MyTicketsPage },
      { path: "/raise-ticket", Component: RaiseTicketPage },
      { path: "/kb", Component: KnowledgeBasePage },
    
    ],
  },

  // Agents and admins only
  {
    element: <ProtectedRoute allowedRoles={["agent", "admin"]} />,
    children: [
      { path: "/tickets", Component: TicketsPage },
      { path: "/assets", Component: AssetsPage },
    ],
  },

  // Admins only
  {
    element: <ProtectedRoute allowedRoles={["admin"]} />,
    children: [
      { path: "/agents", Component: AgentManagementPage },
      { path: "/users", Component: UserManagementPage },
      { path: "/settings", Component: SettingsPage },
    ],
  },
]);