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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{passwords.length}</div>
            <div className="text-blue-700 dark:text-blue-300 font-medium">Gespeicherte Passwörter</div>
          </Card>
          <Card className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{categories.length}</div>
            <div className="text-green-700 dark:text-green-300 font-medium">Ordner erstellt</div>
          </Card>
          <Card className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{passwords.filter(p => p.is_favorite).length}</div>
            <div className="text-purple-700 dark:text-purple-300 font-medium">Favoriten</div>
          </Card>
        </div>

        {/* Search Section - Big and Clear */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Search className="w-7 h-7 text-primary" />
              Passwort suchen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-6 top-5 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Einfach hier tippen um zu suchen..."
                className="pl-16 h-14 text-lg bg-muted/30 border-2 focus:bg-background transition-colors rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-3 text-muted-foreground hover:text-foreground"
                >
                  ✕ Löschen
                </Button>
              )}
            </div>
            
            {/* Category Buttons - Big and Colorful */}
            <div>
              <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Nach Ordner filtern:
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full px-6 py-3 text-base font-medium"
                >
                  📁 Alle ({passwords.length})
                </Button>
                {categories.map((category) => {
                  const count = passwords.filter(p => p.category_id === category.id).length;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="lg"
                      onClick={() => setSelectedCategory(category.id)}
                      className="rounded-full px-6 py-3 text-base font-medium"
                      style={{ 
                        borderColor: category.color,
                        backgroundColor: selectedCategory === category.id ? category.color : undefined,
                        color: selectedCategory === category.id ? 'white' : undefined
                      }}
                    >
                      📂 {category.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Deine Passwörter</h2>
            <Badge variant="secondary" className="px-4 py-2 text-base">
              {filteredPasswords.length} gefunden
            </Badge>
          </div>
        </div>

        {/* Password Cards - Extra Simple */}
        <div className="space-y-6">
          {filteredPasswords.map((password) => (
            <Card key={password.id} className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 bg-gradient-card">
              <CardContent className="p-8">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-1">{password.title}</h3>
                      {password.categories && (
                        <Badge 
                          className="text-sm px-3 py-1 rounded-full font-medium"
                          style={{ 
                            backgroundColor: password.categories.color + '20',
                            borderColor: password.categories.color,
                            color: password.categories.color 
                          }}
                        >
                          📂 {password.categories.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Favorite Star */}
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => toggleFavorite(password)}
                    className="w-12 h-12 rounded-full"
                  >
                    <Star className={`w-8 h-8 ${password.is_favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                
                {/* Info Sections */}
                <div className="grid gap-4 mb-6">
                  {password.username && (
                    <div className="p-4 bg-muted/50 rounded-xl border-2 border-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-muted-foreground mb-2">👤 Benutzername</div>
                          <div className="text-xl font-mono font-bold">{password.username}</div>
                        </div>
                        <Button 
                          size="lg"
                          onClick={() => copyToClipboard(password.username, 'Benutzername')}
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg"
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          Kopieren
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-muted/50 rounded-xl border-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-muted-foreground mb-2">🔒 Passwort</div>
                        <div className="text-xl font-mono font-bold">
                          {visiblePasswords.has(password.id) 
                            ? password.encrypted_password 
                            : '••••••••••••••••'
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={() => togglePasswordVisibility(password.id)}
                          className="px-6 py-3 rounded-xl"
                        >
                          {visiblePasswords.has(password.id) ? 
                            <><EyeOff className="w-5 h-5 mr-2" />Verstecken</> : 
                            <><Eye className="w-5 h-5 mr-2" />Anzeigen</>
                          }
                        </Button>
                        <Button 
                          size="lg"
                          onClick={() => copyToClipboard(password.encrypted_password, 'Passwort')}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg"
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          Kopieren
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {password.url && (
                    <div className="p-4 bg-muted/50 rounded-xl border-2 border-muted">
                      <div className="text-sm font-medium text-muted-foreground mb-2">🌐 Website</div>
                      <a 
                        href={password.url.startsWith('http') ? password.url : `https://${password.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xl text-primary hover:underline font-medium"
                      >
                        {password.url}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t-2 border-muted">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setEditingPassword(password);
                      setIsPasswordDialogOpen(true);
                    }}
                    className="flex-1 py-4 text-lg rounded-xl border-2"
                  >
                    <Edit className="w-5 h-5 mr-3" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => deletePassword(password.id)}
                    className="py-4 px-6 text-lg rounded-xl border-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Löschen
                  </Button>
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