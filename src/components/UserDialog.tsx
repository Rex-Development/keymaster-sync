import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    is_super_admin: boolean;
    user_roles?: { role: string }[];
  } | null;
  onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    role: 'user' as 'user' | 'admin' | 'super_admin',
    is_super_admin: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: '',
        password: '',
        username: user.username,
        full_name: user.full_name || '',
        role: (user.user_roles?.[0]?.role || 'user') as 'user' | 'admin' | 'super_admin',
        is_super_admin: user.is_super_admin,
      });
    } else {
      setFormData({
        email: '',
        password: '',
        username: '',
        full_name: '',
        role: 'user' as 'user' | 'admin' | 'super_admin',
        is_super_admin: false,
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (user) {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: formData.username,
            full_name: formData.full_name,
            is_super_admin: formData.is_super_admin,
          })
          .eq('user_id', user.user_id);

        if (profileError) throw profileError;

        // Update user role
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: formData.role as any })
            .eq('user_id', user.user_id);

        if (roleError) throw roleError;

        toast({
          title: "Erfolgreich aktualisiert",
          description: "Die Benutzerdaten wurden erfolgreich aktualisiert.",
        });
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
              full_name: formData.full_name,
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // The profile and role will be created automatically via the trigger
          // But we need to update the role if it's not 'user'
          if (formData.role !== 'user' || formData.is_super_admin) {
            setTimeout(async () => {
              if (formData.role !== 'user') {
                await supabase
                  .from('user_roles')
                  .update({ role: formData.role })
                  .eq('user_id', authData.user!.id);
              }

              if (formData.is_super_admin) {
                await supabase
                  .from('profiles')
                  .update({ is_super_admin: true })
                  .eq('user_id', authData.user!.id);
              }
            }, 1000);
          }
        }

        toast({
          title: "Benutzer erstellt",
          description: "Der neue Benutzer wurde erfolgreich erstellt.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Benutzer bearbeiten' : 'Neuen Benutzer hinzufügen'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Bearbeiten Sie die Benutzerdaten und -berechtigungen.'
              : 'Erstellen Sie einen neuen Benutzer für das System.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="benutzer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Benutzername *</Label>
            <Input
              id="username"
              placeholder="Benutzername"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Vollständiger Name</Label>
            <Input
              id="full_name"
              placeholder="Vollständiger Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rolle</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as 'user' | 'admin' | 'super_admin' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Benutzer</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="super_admin">Super Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="super_admin"
              checked={formData.is_super_admin}
              onCheckedChange={(checked) => setFormData({ ...formData, is_super_admin: checked })}
            />
            <Label htmlFor="super_admin">Super Administrator</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}