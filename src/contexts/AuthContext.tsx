import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'Employee' | 'Manager' | 'Admin';

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: AppRole;
  status: string;
  org_id: string;
  employee_code: string | null;
  joining_date: string | null;
  manager_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  role: AppRole | null;
  orgId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; redirectPath?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const getRedirectPath = (role: AppRole): string => {
  switch (role) {
    case 'Admin':
      return '/app/directory';
    case 'Manager':
      return '/app/team';
    case 'Employee':
    default:
      return '/app';
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = async (userId: string): Promise<Employee | null> => {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching employee:', error);
      return null;
    }

    return data as Employee | null;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            const emp = await fetchEmployee(session.user.id);
            if (emp) {
              setEmployee(emp);
            } else {
              // No employee record - sign out
              setEmployee(null);
              await supabase.auth.signOut();
            }
            setLoading(false);
          }, 0);
        } else {
          setEmployee(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const emp = await fetchEmployee(session.user.id);
        if (emp) {
          setEmployee(emp);
        } else {
          // No employee record - sign out
          setEmployee(null);
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; redirectPath?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    if (!data.user) {
      return { error: new Error('Login failed') };
    }

    // Fetch employee record
    const emp = await fetchEmployee(data.user.id);
    
    if (!emp) {
      // No employee record - sign out and return error
      await supabase.auth.signOut();
      return { error: new Error('You are not onboarded. Please contact HR.') };
    }

    setEmployee(emp);
    const redirectPath = getRedirectPath(emp.role as AppRole);
    
    return { error: null, redirectPath };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmployee(null);
  };

  const value = {
    user,
    session,
    employee,
    role: employee?.role as AppRole | null,
    orgId: employee?.org_id ?? null,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
