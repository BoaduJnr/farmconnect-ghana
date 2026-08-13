import type { ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Role } from '@farmconnect/shared';
import AdminCrops from './pages/admin/Crops';
import AdminDisputes from './pages/admin/Disputes';
import AdminListings from './pages/admin/Listings';
import AdminSupport from './pages/admin/Support';
import AdminSupportThread from './pages/admin/SupportThread';
import AdminUsers from './pages/admin/Users';
import Advisory from './pages/Advisory';
import CreateListing from './pages/farmer/CreateListing';
import FarmerHome from './pages/farmer/Home';
import FarmerListings from './pages/farmer/Listings';
import FarmerMomoSetup from './pages/farmer/MomoSetup';
import Checkout from './pages/buyer/Checkout';
import ListingDetail from './pages/buyer/ListingDetail';
import Marketplace from './pages/buyer/Marketplace';
import SubmitPayment from './pages/buyer/SubmitPayment';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Notifications from './pages/Notifications';
import Orders from './pages/Orders';
import Otp from './pages/Otp';
import Prices from './pages/Prices';
import Profile from './pages/Profile';
import RoleSelect from './pages/RoleSelect';
import Support from './pages/Support';
import { hasMomoSetup, roleHomePath } from './lib/roleHome';
import { useAuthStore } from './store/authStore';

function RequireAuth({ children }: Readonly<{ children: ReactNode }>) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireRole({ role, children }: Readonly<{ role: Role; children: ReactNode }>) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={roleHomePath(user)} replace />;
  }
  return <>{children}</>;
}

/** Every farmer route except the momo-setup screen itself — bounces back to the forced
 * setup screen until momo details are linked (buyers pay that account directly, no gateway). */
function RequireFarmerReady({ children }: Readonly<{ children: ReactNode }>) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== Role.FARMER) {
    return <Navigate to={roleHomePath(user)} replace />;
  }
  if (!hasMomoSetup(user)) {
    return <Navigate to="/farmer/momo-setup" replace />;
  }
  return <>{children}</>;
}

/** Onboarding/login/otp/role screens redirect straight to the user's role home when already authed. */
function RedirectIfAuthed({ children }: Readonly<{ children: ReactNode }>) {
  const user = useAuthStore((s) => s.user);
  if (user) {
    return <Navigate to={roleHomePath(user)} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RedirectIfAuthed>
        <Onboarding />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/otp',
    element: (
      <RedirectIfAuthed>
        <Otp />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/role',
    element: (
      <RedirectIfAuthed>
        <RoleSelect />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/farmer/momo-setup',
    element: (
      <RequireRole role={Role.FARMER}>
        <FarmerMomoSetup />
      </RequireRole>
    ),
  },
  {
    path: '/farmer/home',
    element: (
      <RequireFarmerReady>
        <FarmerHome />
      </RequireFarmerReady>
    ),
  },
  {
    path: '/farmer/listings',
    element: (
      <RequireFarmerReady>
        <FarmerListings />
      </RequireFarmerReady>
    ),
  },
  {
    path: '/farmer/listings/new',
    element: (
      <RequireFarmerReady>
        <CreateListing />
      </RequireFarmerReady>
    ),
  },
  {
    path: '/buyer/market',
    element: (
      <RequireRole role={Role.BUYER}>
        <Marketplace />
      </RequireRole>
    ),
  },
  {
    path: '/buyer/listings/:id',
    element: (
      <RequireRole role={Role.BUYER}>
        <ListingDetail />
      </RequireRole>
    ),
  },
  {
    path: '/buyer/checkout/:listingId',
    element: (
      <RequireRole role={Role.BUYER}>
        <Checkout />
      </RequireRole>
    ),
  },
  {
    path: '/orders/:id/pay',
    element: (
      <RequireRole role={Role.BUYER}>
        <SubmitPayment />
      </RequireRole>
    ),
  },
  {
    path: '/orders',
    element: (
      <RequireAuth>
        <Orders />
      </RequireAuth>
    ),
  },
  {
    path: '/advisory',
    element: (
      <RequireAuth>
        <Advisory />
      </RequireAuth>
    ),
  },
  {
    path: '/prices',
    element: (
      <RequireAuth>
        <Prices />
      </RequireAuth>
    ),
  },
  {
    path: '/notifications',
    element: (
      <RequireAuth>
        <Notifications />
      </RequireAuth>
    ),
  },
  {
    path: '/support',
    element: (
      <RequireAuth>
        <Support />
      </RequireAuth>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminUsers />
      </RequireRole>
    ),
  },
  {
    path: '/admin/listings',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminListings />
      </RequireRole>
    ),
  },
  {
    path: '/admin/disputes',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminDisputes />
      </RequireRole>
    ),
  },
  {
    path: '/admin/crops',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminCrops />
      </RequireRole>
    ),
  },
  {
    path: '/admin/support',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminSupport />
      </RequireRole>
    ),
  },
  {
    path: '/admin/support/:userId',
    element: (
      <RequireRole role={Role.ADMIN}>
        <AdminSupportThread />
      </RequireRole>
    ),
  },
  {
    path: '/profile',
    element: (
      <RequireAuth>
        <Profile />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
