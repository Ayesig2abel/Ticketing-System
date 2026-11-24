import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth, type Role } from "./AuthContext";

interface ProtectedRouteProps {
  /** If provided, only these roles may access the nested routes. */
  allowedRoles?: Role[];
}

/**
 * Wrap protected routes with this component in routes.ts.
 * - Redirects to "/" (login) if no one is logged in.
 * - Redirects to "/dashboard" if logged in but role isn't allowed.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
