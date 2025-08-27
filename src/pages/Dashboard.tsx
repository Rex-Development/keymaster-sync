import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Eye, 
  EyeOff, 
  Copy,
  Edit,
  Trash2,
  Star,
  Folder,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PasswordDialog } from '@/components/PasswordDialog';
import { CategoryDialog } from '@/components/CategoryDialog';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  user_id: string;
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
  user_id: string;
  categories?: Category;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredPasswords, setFilteredPasswords] = useState<Password[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    filterPasswords();
  }, [passwords, searchTerm, selectedCategory]);

  const fetchData = async () => {
    try {
      const [passwordsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('passwords')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (passwordsResponse.error) throw passwordsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      // Fetch categories for passwords
      const passwordsWithCategories = await Promise.all(
        (passwordsResponse.data || []).map(async (password) => {
          if (password.category_id) {
            const { data: category } = await supabase
              .from('categories')
              .select('*')
              .eq('id', password.category_id)
              .single();
            
            return {
              ...password,
              categories: category
            };
          }
          return password;
        })
      );

      setPasswords(passwordsWithCategories);
      setCategories(categoriesResponse.data || []);
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

  const filterPasswords = () => {
    let filtered = passwords;

    if (searchTerm) {
      filtered = filtered.filter(password => 
        password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        password.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        password.url?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(password => password.category_id === selectedCategory);
    }

    setFilteredPasswords(filtered);
  };

  const togglePasswordVisibility = (passwordId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(passwordId)) {
      newVisible.delete(passwordId);
    } else {
      newVisible.add(passwordId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopiert",
        description: `${label} wurde in die Zwischenablage kopiert.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht in die Zwischenablage kopieren.",
        variant: "destructive",
      });
    }
  };

  const deletePassword = async (passwordId: string) => {
    try {
      const { error } = await supabase
        .from('passwords')
        .delete()
        .eq('id', passwordId);

      if (error) throw error;

      setPasswords(passwords.filter(p => p.id !== passwordId));
      toast({
        title: "Erfolgreich gelöscht",
        description: "Das Passwort wurde entfernt.",
      });
    } catch (error: any) {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (password: Password) => {
    try {
      const { error } = await supabase
        .from('passwords')
        .update({ is_favorite: !password.is_favorite })
        .eq('id', password.id);

      if (error) throw error;

      setPasswords(passwords.map(p => 
        p.id === password.id 
          ? { ...p, is_favorite: !p.is_favorite }
          : p
      ));
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Passwort Master</h1>
              <p className="text-sm text-muted-foreground">Willkommen, {user?.user_metadata?.username || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Welcome Header - Super prominent */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Passwort Master
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Alle deine Passwörter sicher an einem Ort
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setIsPasswordDialogOpen(true)}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 shadow-xl text-lg px-8 py-4 h-auto"
            >
              <Plus className="w-6 h-6 mr-3" />
              Neues Passwort speichern
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryDialogOpen(true)}
              size="lg"
              className="shadow-lg text-lg px-8 py-4 h-auto"
            >
              <Folder className="w-6 h-6 mr-3" />
              Ordner verwalten
            </Button>
          </div>
        </div>

        {/* Simple Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Passwort suchen..."
              className="pl-12 h-12 text-lg rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Deine Passwörter</h2>
            <Badge variant="secondary" className="px-4 py-2 text-base">
              {filteredPasswords.length} gefunden
            </Badge>
          </div>
        </div>

        {/* Simple Password Cards */}
        <div className="space-y-4">
          {filteredPasswords.map((password) => (
            <Card key={password.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Title */}
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="text-xl font-bold">{password.title}</h3>
                      {password.username && (
                        <p className="text-muted-foreground">{password.username}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePasswordVisibility(password.id)}
                    >
                      {visiblePasswords.has(password.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(password.encrypted_password, 'Passwort')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPassword(password);
                        setIsPasswordDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Password Display */}
                <div className="mt-4 p-3 bg-muted rounded-lg font-mono">
                  {visiblePasswords.has(password.id) 
                    ? password.encrypted_password 
                    : '••••••••••••••••'
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          
        {/* Empty State - Super Clear */}
        {filteredPasswords.length === 0 && (
          <Card className="shadow-xl border-2 border-dashed border-muted">
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Shield className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-3xl font-bold mb-4">
                {searchTerm ? '🔍 Nichts gefunden!' : '📝 Noch keine Passwörter!'}
              </h3>
              <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                {searchTerm 
                  ? 'Probier einen anderen Suchbegriff oder schau in einem anderen Ordner.' 
                  : 'Leg einfach los und speichere dein erstes Passwort. Es ist super einfach!'
                }
              </p>
              {searchTerm ? (
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setSearchTerm('')}
                  className="px-8 py-4 text-lg rounded-xl"
                >
                  🔄 Suche zurücksetzen
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsPasswordDialogOpen(true)} 
                  size="lg"
                  className="bg-gradient-primary px-10 py-6 text-xl rounded-xl shadow-xl"
                >
                  <Plus className="w-6 h-6 mr-3" />
                  Erstes Passwort hinzufügen
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <PasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) setEditingPassword(null);
        }}
        password={editingPassword}
        categories={categories}
        onSuccess={fetchData}
      />

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}
        category={editingCategory}
        onSuccess={fetchData}
      />
    </div>
  );
}