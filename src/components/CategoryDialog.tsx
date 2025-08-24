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
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess: () => void;
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

export function CategoryDialog({ 
  open, 
  onOpenChange, 
  category, 
  onSuccess 
}: CategoryDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3b82f6',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Fehler beim Laden",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCategory.name.trim(),
          color: newCategory.color,
          icon: 'folder',
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Erfolgreich erstellt",
        description: "Die Kategorie wurde erfolgreich erstellt.",
      });

      setNewCategory({ name: '', color: '#3b82f6' });
      fetchCategories();
      onSuccess();
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

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Erfolgreich gelöscht",
        description: "Die Kategorie wurde entfernt.",
      });

      fetchCategories();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-enhanced sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🏷️ Kategorien verwalten
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Organisieren Sie Ihre Passwörter mit benutzerdefinierten Kategorien
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Create New Category */}
          <div className="form-section">
            <div className="form-label">
              ✨ Neue Kategorie erstellen
            </div>
            <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <form onSubmit={handleCreateCategory} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="category-name" className="text-sm font-medium">Name der Kategorie</Label>
                      <Input
                        id="category-name"
                        placeholder="z.B. Banking, Social Media, Arbeit..."
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        required
                        className="mt-1"
                      />
                      <p className="form-description">Wählen Sie einen beschreibenden Namen</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Farbe auswählen</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                              newCategory.color === color 
                                ? 'border-foreground ring-2 ring-offset-2 ring-primary' 
                                : 'border-border hover:border-foreground'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategory({ ...newCategory, color })}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isLoading ? 'Wird erstellt...' : '🎯 Kategorie erstellen'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Existing Categories */}
          <div className="form-section">
            <div className="form-label">
              📂 Vorhandene Kategorien ({categories.length})
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                    🏷️
                  </div>
                  <p className="text-lg font-medium mb-2">Noch keine Kategorien</p>
                  <p className="text-sm">Erstellen Sie Ihre erste Kategorie oben</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <Card key={cat.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-6 h-6 rounded-lg shadow-sm border border-white/20"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div>
                            <span className="font-semibold text-foreground">{cat.name}</span>
                            <p className="text-xs text-muted-foreground mt-1">Kategorie</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Kategorie löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button onClick={() => onOpenChange(false)} className="px-6">
            ✅ Fertig
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
