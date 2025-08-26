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

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Quick Actions Section */}
        <Card className="mb-8 bg-gradient-to-r from-card to-muted/30 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Passwort Master
                  </h2>
                  <p className="text-muted-foreground">
                    Verwalten Sie Ihre {passwords.length} gespeicherten Passwörter
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCategoryDialogOpen(true)}
                  className="shadow-sm"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Kategorien verwalten
                </Button>
                <Button 
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="bg-gradient-primary hover:opacity-90 shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Passwort hinzufügen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search & Filter Section */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Suchen & Filtern</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nach Titel, Benutzername oder Website suchen..."
                className="pl-12 h-12 text-base bg-muted/30 border-muted focus:bg-background transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Nach Kategorie filtern:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full"
                >
                  Alle ({passwords.length})
                </Button>
                {categories.map((category) => {
                  const count = passwords.filter(p => p.category_id === category.id).length;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="rounded-full"
                      style={{ 
                        borderColor: selectedCategory === category.id ? category.color : undefined,
                        backgroundColor: selectedCategory === category.id ? category.color : undefined 
                      }}
                    >
                      {category.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Ihre Passwörter</h3>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredPasswords.length} gefunden
            </Badge>
          </div>
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchTerm('')}
              className="text-muted-foreground hover:text-foreground"
            >
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {/* Password Grid */}
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPasswords.map((password) => (
            <Card key={password.id} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 bg-gradient-card border-0">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground truncate">{password.title}</h4>
                      {password.is_favorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    {password.categories && (
                      <Badge 
                        variant="outline" 
                        className="text-xs rounded-full"
                        style={{ 
                          borderColor: password.categories.color,
                          color: password.categories.color 
                        }}
                      >
                        {password.categories.name}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(password)}
                      className="h-8 w-8 p-0"
                    >
                      <Star className={`w-4 h-4 ${password.is_favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </div>
                
                {/* Details */}
                <div className="space-y-3">
                  {password.username && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Benutzername</div>
                        <div className="font-mono text-sm truncate">{password.username}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => copyToClipboard(password.username, 'Benutzername')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Passwort</div>
                      <div className="font-mono text-sm">
                        {visiblePasswords.has(password.id) 
                          ? password.encrypted_password 
                          : '••••••••••••'
                        }
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => togglePasswordVisibility(password.id)}
                      >
                        {visiblePasswords.has(password.id) ? 
                          <EyeOff className="w-3 h-3" /> : 
                          <Eye className="w-3 h-3" />
                        }
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => copyToClipboard(password.encrypted_password, 'Passwort')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {password.url && (
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Website</div>
                      <a 
                        href={password.url.startsWith('http') ? password.url : `https://${password.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm truncate block"
                      >
                        {password.url}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-muted/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPassword(password);
                      setIsPasswordDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePassword(password.id)}
                    className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          
        {/* Empty State */}
        {filteredPasswords.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {searchTerm ? 'Keine Ergebnisse gefunden' : 'Noch keine Passwörter'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? 'Versuchen Sie einen anderen Suchbegriff oder überprüfen Sie Ihre Filter.' 
                  : 'Fügen Sie Ihr erstes Passwort hinzu, um die Verwaltung zu beginnen.'
                }
              </p>
              {searchTerm ? (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Filter zurücksetzen
                </Button>
              ) : (
                <Button onClick={() => setIsPasswordDialogOpen(true)} className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
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