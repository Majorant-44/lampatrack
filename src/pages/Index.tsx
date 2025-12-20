import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLampadaires, useSignalements } from '@/hooks/useLampadaires';
import LampadaireMap from '@/components/map/LampadaireMap';
import ReportForm from '@/components/report/ReportForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Lamp, 
  LogOut, 
  Settings, 
  Menu, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin
} from 'lucide-react';
import type { Lampadaire } from '@/types/database';

export default function Index() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const { lampadaires, loading: lampadairesLoading } = useLampadaires();
  const { signalements, createSignalement } = useSignalements();
  const navigate = useNavigate();
  
  const [selectedLampadaire, setSelectedLampadaire] = useState<Lampadaire | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || lampadairesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLampadaireClick = (lampadaire: Lampadaire) => {
    setSelectedLampadaire(lampadaire);
    setShowReportForm(false);
  };

  const handleReport = () => {
    if (selectedLampadaire) {
      setShowReportForm(true);
    }
  };

  const handleSubmitReport = async (cause: string, description: string | null, photoUrl: string) => {
    if (!selectedLampadaire || !user) return;
    
    await createSignalement(
      selectedLampadaire.id,
      user.id,
      cause,
      description,
      photoUrl
    );
    
    setShowReportForm(false);
    setSelectedLampadaire(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get user's signalements
  const userSignalements = signalements.filter(s => s.user_id === user.id);
  const pendingCount = userSignalements.filter(s => s.status === 'pending').length;
  const approvedCount = userSignalements.filter(s => s.status === 'approved').length;
  const rejectedCount = userSignalements.filter(s => s.status === 'rejected').length;

  // Stats
  const functionalCount = lampadaires.filter(l => l.status === 'functional').length;
  const damagedCount = lampadaires.filter(l => l.status === 'damaged').length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between z-[1001] relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Lamp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">LampaTrack</h1>
            <p className="text-xs text-muted-foreground">Suivi des lampadaires</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats badges */}
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {functionalCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {damagedCount}
            </Badge>
          </div>

          {/* Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="z-[1002]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* User info */}
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-green-500/10 text-center">
                    <p className="text-2xl font-bold text-green-600">{functionalCount}</p>
                    <p className="text-xs text-muted-foreground">Fonctionnels</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 text-center">
                    <p className="text-2xl font-bold text-red-600">{damagedCount}</p>
                    <p className="text-xs text-muted-foreground">Endommagés</p>
                  </div>
                </div>

                {/* User signalements */}
                <div className="space-y-2">
                  <p className="font-medium text-sm">Mes signalements</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {pendingCount} en attente
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      {approvedCount}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-red-600">
                      <XCircle className="h-3 w-3" />
                      {rejectedCount}
                    </Badge>
                  </div>
                </div>

                {/* Admin link */}
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/admin');
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Dashboard Admin
                  </Button>
                )}

                {/* Sign out */}
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <LampadaireMap
          lampadaires={lampadaires}
          onLampadaireClick={handleLampadaireClick}
          selectedLampadaire={selectedLampadaire}
          showUserLocation={true}
        />

        {/* Selected lampadaire panel */}
        {selectedLampadaire && !showReportForm && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-md mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{selectedLampadaire.identifier}</CardTitle>
                  </div>
                  <Badge 
                    variant={selectedLampadaire.status === 'functional' ? 'default' : 'destructive'}
                    className={selectedLampadaire.status === 'functional' ? 'bg-green-500' : ''}
                  >
                    {selectedLampadaire.status === 'functional' ? 'Fonctionnel' : 'Endommagé'}
                  </Badge>
                </div>
                <CardDescription>
                  {selectedLampadaire.latitude.toFixed(6)}, {selectedLampadaire.longitude.toFixed(6)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedLampadaire(null)}
                  >
                    Fermer
                  </Button>
                  {selectedLampadaire.status === 'functional' && (
                    <Button 
                      className="flex-1 gap-2"
                      onClick={handleReport}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Signaler un problème
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report form */}
        {showReportForm && selectedLampadaire && (
          <div className="absolute inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <ReportForm
              lampadaire={selectedLampadaire}
              onSubmit={handleSubmitReport}
              onCancel={() => {
                setShowReportForm(false);
                setSelectedLampadaire(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}