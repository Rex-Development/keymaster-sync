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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Password {
  id: string;
  title: string;
  username: string;
  encrypted_password: string;
  url: string;
  notes: string;
  is_favorite: boolean;
  category_id: string | null;
}

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password?: Password | null;
  categories: Category[];
  onSuccess: () => void;
}

export function PasswordDialog({ 
  open, 
  onOpenChange, 
  password, 
  categories, 
  onSuccess 
}: PasswordDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category_id: 'none',
    is_favorite: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (password) {
      setFormData({
        title: password.title,
        username: password.username || '',
        password: password.encrypted_password,
        url: password.url || '',
        notes: password.notes || '',
        category_id: password.category_id || 'none',
        is_favorite: password.is_favorite,
      });
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        category_id: 'none',
        is_favorite: false,
      });
    }
  }, [password, open]);

  const generatePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const passwordData = {
        title: formData.title,
        username: formData.username || null,
        encrypted_password: formData.password,
        url: formData.url || null,
        notes: formData.notes || null,
        category_id: formData.category_id === 'none' ? null : formData.category_id || null,
        is_favorite: formData.is_favorite,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      if (password) {
        const { error } = await supabase
          .from('passwords')
          .update(passwordData)
          .eq('id', password.id);

        if (error) throw error;

        toast({
          title: "Erfolgreich aktualisiert",
          description: "Das Passwort wurde erfolgreich aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('passwords')
          .insert(passwordData);

        if (error) throw error;

        toast({
          title: "Erfolgreich erstellt",
          description: "Das Passwort wurde erfolgreich erstellt.",
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
      <DialogContent className="dialog-enhanced sm:max-w-[550px]">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {password ? '🔐 Passwort bearbeiten' : '✨ Neues Passwort hinzufügen'}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            {password 
              ? 'Bearbeiten Sie die Details Ihres gespeicherten Passworts'
              : 'Erstellen Sie einen neuen sicheren Eintrag für Ihren Tresor'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grundinformationen */}
          <div className="form-section">
            <div className="form-label">
              📝 Grundinformationen
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Titel *</Label>
                <Input
                  id="title"
                  placeholder="z.B. Gmail, Facebook, Netflix..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="mt-1"
                />
                <p className="form-description">Ein eindeutiger Name für diesen Eintrag</p>
              </div>

              <div>
                <Label htmlFor="username" className="text-sm font-medium">Benutzername / E-Mail</Label>
                <Input
                  id="username"
                  placeholder="Ihre Anmeldedaten"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Passwort-Bereich */}
          <div className="form-section">
            <div className="form-label">
              🔒 Passwort-Sicherheit
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Passwort *</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sicheres Passwort"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  title="Sicheres Passwort generieren"
                  className="px-3"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="form-description">Klicken Sie auf das Refresh-Symbol für ein automatisch generiertes sicheres Passwort</p>
            </div>
          </div>

          {/* Zusätzliche Details */}
          <div className="form-section">
            <div className="form-label">
              🌐 Zusätzliche Details
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="url" className="text-sm font-medium">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium">Kategorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="none">Keine Kategorie</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Notizen</Label>
                <Textarea
                  id="notes"
                  placeholder="Zusätzliche Informationen..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <Label htmlFor="favorite" className="text-sm font-medium cursor-pointer">⭐ Als Favorit markieren</Label>
                  <p className="text-xs text-muted-foreground mt-1">Favoriten werden oben in der Liste angezeigt</p>
                </div>
                <Switch
                  id="favorite"
                  checked={formData.is_favorite}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_favorite: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="px-6 bg-gradient-to-r from-primary to-accent"
            >
              {isLoading ? 'Speichern...' : '💾 Speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}