import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Wrench,
  Upload,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Lampadaire, LampadaireStatus } from '@/types/database';

interface AdminLampadairesProps {
  lampadaires: Lampadaire[];
  onAdd: (lampadaire: Omit<Lampadaire, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<Lampadaire> & { technician_name?: string; intervention_type?: string }) => Promise<any>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
}

export default function AdminLampadaires({ lampadaires, onAdd, onUpdate, onDelete, onRefresh }: AdminLampadairesProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLampadaire, setEditingLampadaire] = useState<Lampadaire | null>(null);
  const [repairingLampadaire, setRepairingLampadaire] = useState<Lampadaire | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [identifier, setIdentifier] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [status, setStatus] = useState<LampadaireStatus>('functional');
  const [technicianName, setTechnicianName] = useState('');
  const [interventionType, setInterventionType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImportGeoJSON = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const geojsonData = JSON.parse(text);

        const { data, error } = await supabase.functions.invoke('import-lampadaires', {
          body: { geojsonData }
        });

        if (error) throw error;

        toast({
          title: 'Import réussi',
          description: `${data.inserted} lampadaires importés sur ${data.total}`,
        });

        if (onRefresh) {
          await onRefresh();
        }
      } catch (error: any) {
        console.error('Import error:', error);
        toast({
          title: 'Erreur d\'import',
          description: error.message || 'Impossible d\'importer les données',
          variant: 'destructive',
        });
      } finally {
        setImporting(false);
      }
    };

    input.click();
  };

  const resetForm = () => {
    setIdentifier('');
    setLatitude('');
    setLongitude('');
    setStatus('functional');
    setTechnicianName('');
    setInterventionType('');
  };

  const handleAdd = async () => {
    if (!identifier || !latitude || !longitude) return;
    
    setLoading(true);
    await onAdd({
      identifier,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status,
    });
    setLoading(false);
    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (lampadaire: Lampadaire) => {
    setEditingLampadaire(lampadaire);
    setIdentifier(lampadaire.identifier);
    setLatitude(lampadaire.latitude.toString());
    setLongitude(lampadaire.longitude.toString());
    setStatus(lampadaire.status);
  };

  const handleUpdate = async () => {
    if (!editingLampadaire || !identifier || !latitude || !longitude) return;
    
    setLoading(true);
    await onUpdate(editingLampadaire.id, {
      identifier,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status,
    });
    setLoading(false);
    setEditingLampadaire(null);
    resetForm();
  };

  const handleRepair = async () => {
    if (!repairingLampadaire) return;
    
    setLoading(true);
    await onUpdate(repairingLampadaire.id, {
      status: 'functional',
      technician_name: technicianName || undefined,
      intervention_type: interventionType || undefined,
    });
    setLoading(false);
    setRepairingLampadaire(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce lampadaire ?')) {
      await onDelete(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des lampadaires</CardTitle>
            <CardDescription>{lampadaires.length} lampadaires enregistrés</CardDescription>
          </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleImportGeoJSON}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? 'Import...' : 'Importer GeoJSON'}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un lampadaire</DialogTitle>
                <DialogDescription>Renseignez les informations du nouveau lampadaire</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Identifiant</Label>
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="LP-XXX"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="48.8566"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="2.3522"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>État</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as LampadaireStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">Fonctionnel</SelectItem>
                      <SelectItem value="damaged">Endommagé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={loading} className="w-full">
                  {loading ? 'Ajout...' : 'Ajouter'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifiant</TableHead>
                <TableHead>Coordonnées</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Mise à jour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lampadaires.map((lampadaire) => (
                <TableRow key={lampadaire.id}>
                  <TableCell className="font-medium">{lampadaire.identifier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lampadaire.latitude.toFixed(4)}, {lampadaire.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    {lampadaire.status === 'functional' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Fonctionnel
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Endommagé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(lampadaire.updated_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {lampadaire.status === 'damaged' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setRepairingLampadaire(lampadaire)}
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Marquer comme réparé</DialogTitle>
                              <DialogDescription>
                                {lampadaire.identifier}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Nom du technicien (optionnel)</Label>
                                <Input
                                  value={technicianName}
                                  onChange={(e) => setTechnicianName(e.target.value)}
                                  placeholder="Jean Dupont"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type d'intervention (optionnel)</Label>
                                <Input
                                  value={interventionType}
                                  onChange={(e) => setInterventionType(e.target.value)}
                                  placeholder="Remplacement ampoule"
                                />
                              </div>
                              <Button onClick={handleRepair} disabled={loading} className="w-full">
                                {loading ? 'Enregistrement...' : 'Confirmer la réparation'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(lampadaire)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier le lampadaire</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Identifiant</Label>
                              <Input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Latitude</Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={latitude}
                                  onChange={(e) => setLatitude(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Longitude</Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={longitude}
                                  onChange={(e) => setLongitude(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>État</Label>
                              <Select value={status} onValueChange={(v) => setStatus(v as LampadaireStatus)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="functional">Fonctionnel</SelectItem>
                                  <SelectItem value="damaged">Endommagé</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleUpdate} disabled={loading} className="w-full">
                              {loading ? 'Mise à jour...' : 'Mettre à jour'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(lampadaire.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
