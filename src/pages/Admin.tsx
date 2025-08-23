import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  User,
  Mail,
  Key
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserDialog } from '@/components/UserDialog';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  is_super_admin: boolean;
  created_at: string;
  user_roles?: {
    role: string;
  }[];
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    try {
      // Check if user is admin or super admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('user_id', user!.id)
        .single();

      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);

      if (rolesError) throw rolesError;

      const hasAdminRole = roles?.some(r => ['admin', 'super_admin'].includes(r.role)) || profile?.is_super_admin;

      if (!hasAdminRole) {
        toast({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung für das Admin-Panel.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user roles separately
      const profilesWithRoles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);
          
          return {
            ...profile,
            user_roles: roles || []
          };
        })
      );

      setProfiles(profilesWithRoles);
    } catch (error: any) {
      toast({
        title: "Fehler beim Laden",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Note: This will only work if the current user is a super admin
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Fehler beim Löschen",
        description: "Benutzer können nur über das Supabase Dashboard gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const getRoleDisplay = (profile: Profile) => {
    if (profile.is_super_admin) {
      return { role: 'Super Admin', color: 'destructive' as const };
    }
    
    const role = profile.user_roles?.[0]?.role || 'user';
    switch (role) {
      case 'admin':
        return { role: 'Admin', color: 'default' as const };
      case 'super_admin':
        return { role: 'Super Admin', color: 'destructive' as const };
      default:
        return { role: 'Benutzer', color: 'secondary' as const };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Benutzerverwaltung</p>
            </div>
          </div>
          <Button onClick={() => setIsUserDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Benutzer hinzufügen
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Benutzer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administratoren</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => 
                  p.is_super_admin || 
                  p.user_roles?.some(r => ['admin', 'super_admin'].includes(r.role))
                ).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Normale Benutzer</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => 
                  !p.is_super_admin && 
                  !p.user_roles?.some(r => ['admin', 'super_admin'].includes(r.role))
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Benutzer verwalten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles.map((profile) => {
                const roleDisplay = getRoleDisplay(profile);
                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{profile.username}</h3>
                          <Badge variant={roleDisplay.color}>
                            {roleDisplay.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {profile.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Erstellt: {new Date(profile.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(profile);
                          setIsUserDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {profile.user_id !== user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(profile.user_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {profiles.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Keine Benutzer gefunden</h3>
                  <p className="text-muted-foreground">
                    Fügen Sie den ersten Benutzer hinzu.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          setIsUserDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
}