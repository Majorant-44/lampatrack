import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';
import type { LampadaireHistory } from '@/types/database';

interface AdminHistoryProps {
  history: LampadaireHistory[];
  loading: boolean;
}

export default function AdminHistory({ history, loading }: AdminHistoryProps) {
  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    if (status === 'functional') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Fonctionnel
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        Endommagé
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique des interventions
        </CardTitle>
        <CardDescription>
          {history.length} enregistrement{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun historique disponible
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Heure</TableHead>
                  <TableHead>Lampadaire</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Changement d'état</TableHead>
                  <TableHead>Technicien</TableHead>
                  <TableHead>Type d'intervention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.lampadaire?.identifier || 'N/A'}
                    </TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      {entry.previous_status && entry.new_status ? (
                        <div className="flex items-center gap-2">
                          {getStatusBadge(entry.previous_status)}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getStatusBadge(entry.new_status)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.technician_name || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {entry.intervention_type || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
