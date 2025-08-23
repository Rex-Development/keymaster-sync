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
              <h1 className="text-xl font-bold text-foreground">KeyMaster</h1>
              <p className="text-sm text-muted-foreground">Willkommen, {user?.user_metadata?.username || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Passwörter durchsuchen..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <Folder className="w-4 h-4 mr-2" />
              Kategorien
            </Button>
            <Button onClick={() => setIsPasswordDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Neues Passwort
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              style={{ borderColor: category.color }}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Password List */}
        <div className="grid gap-4">
          {filteredPasswords.map((password) => (
            <Card key={password.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{password.title}</h3>
                      {password.is_favorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {password.categories && (
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: password.categories.color }}
                        >
                          {password.categories.name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {password.username && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-20">Benutzer:</span>
                          <span className="font-mono">{password.username}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(password.username, 'Benutzername')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-20">Passwort:</span>
                        <span className="font-mono">
                          {visiblePasswords.has(password.id) 
                            ? password.encrypted_password 
                            : '••••••••'
                          }
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
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
                          onClick={() => copyToClipboard(password.encrypted_password, 'Passwort')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {password.url && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-20">Website:</span>
                          <a 
                            href={password.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {password.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(password)}
                    >
                      <Star className={`w-4 h-4 ${password.is_favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPassword(password);
                        setIsPasswordDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePassword(password.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredPasswords.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Keine Passwörter gefunden</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Fügen Sie Ihr erstes Passwort hinzu.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsPasswordDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erstes Passwort hinzufügen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
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