import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User, UserRole } from '@/services/api';

interface LocationData {
  latitude: number;
  longitude: number;
  label: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  location: LocationData | null;
  isLoading: boolean;
  setLocation: (loc: LocationData) => Promise<void>;
  // CHANGE 1: Updated parameter name to accurately represent what it accepts
  login: (emailOrPhone: string, password: string) => Promise<User>;
  register: (data: {
    username: string;
    email: string;        // CHANGE 2: Marked as strictly required
    phone_number: string; // CHANGE 3: Marked as strictly required
    password: string;
    role: UserRole;
    name?: string;
    address?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYS = {
  token: 'nobanno_token',
  user: 'nobanno_user',
  role: 'nobanno_role',
  location: 'nobanno_location',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [location, setLocationState] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing persistent session state on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, storedRole, storedLocation] =
          await Promise.all([
            AsyncStorage.getItem(KEYS.token),
            AsyncStorage.getItem(KEYS.user),
            AsyncStorage.getItem(KEYS.role),
            AsyncStorage.getItem(KEYS.location),
          ]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedRole) setRoleState(storedRole as UserRole);
        if (storedLocation) setLocationState(JSON.parse(storedLocation));
      } catch (e) {
        console.error("Failed to load auth session:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setLocation = useCallback(async (loc: LocationData) => {
    setLocationState(loc);
    await AsyncStorage.setItem(KEYS.location, JSON.stringify(loc));
  }, []);

  const persistSession = useCallback(async (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setRoleState(nextUser.role);
    await AsyncStorage.multiSet([
      [KEYS.token, nextToken],
      [KEYS.user, JSON.stringify(nextUser)],
      [KEYS.role, nextUser.role],
    ]);
  }, []);

  // Login: Pass emailOrPhone directly downstream
  const login = useCallback(
    async (emailOrPhone: string, password: string) => {
      // CHANGE 4: Ensure your underlying api.login wrapper receives the right variable
      const result = await api.login(emailOrPhone, password);
      await persistSession(result.token, result.user);
      return result.user;
    },
    [persistSession],
  );

  // Registration: Receives clean structured parameters
  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      phone_number: string;
      password: string;
      role: UserRole;
      name?: string;
      address?: string;
    }) => {
      await api.register({
        ...data,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
    },
    [location],
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setRoleState(null);
    await AsyncStorage.multiRemove([KEYS.token, KEYS.user, KEYS.role]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await api.getProfile(token);
    setUser(profile);
    setRoleState(profile.role);
    await AsyncStorage.setItem(KEYS.user, JSON.stringify(profile));
    await AsyncStorage.setItem(KEYS.role, profile.role);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      location,
      isLoading,
      setLocation,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [
      token,
      user,
      role,
      location,
      isLoading,
      setLocation,
      login,
      register,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}