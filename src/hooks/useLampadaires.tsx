import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Lampadaire, Signalement, LampadaireHistory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useLampadaires() {
  const [lampadaires, setLampadaires] = useState<Lampadaire[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLampadaires();
  }, []);

  const fetchLampadaires = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lampadaires')
      .select('*')
      .order('identifier');

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les lampadaires',
        variant: 'destructive',
      });
    } else {
      setLampadaires(data as Lampadaire[]);
    }
    setLoading(false);
  };

  const addLampadaire = async (lampadaire: Omit<Lampadaire, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('lampadaires')
      .insert(lampadaire)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le lampadaire',
        variant: 'destructive',
      });
      return null;
    }

    setLampadaires(prev => [...prev, data as Lampadaire]);
    toast({
      title: 'Succès',
      description: 'Lampadaire ajouté avec succès',
    });
    return data;
  };

  const updateLampadaire = async (id: string, updates: Partial<Lampadaire> & { technician_name?: string; intervention_type?: string }) => {
    // Extract only the fields that belong to the lampadaires table
    const { technician_name, intervention_type, ...lampadaireUpdates } = updates;
    
    const { data, error } = await supabase
      .from('lampadaires')
      .update(lampadaireUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lampadaire:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le lampadaire',
        variant: 'destructive',
      });
      return null;
    }

    setLampadaires(prev => prev.map(l => l.id === id ? data as Lampadaire : l));
    toast({
      title: 'Succès',
      description: 'Lampadaire mis à jour',
    });
    return data;
  };

  const deleteLampadaire = async (id: string) => {
    const { error } = await supabase
      .from('lampadaires')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le lampadaire',
        variant: 'destructive',
      });
      return false;
    }

    setLampadaires(prev => prev.filter(l => l.id !== id));
    toast({
      title: 'Succès',
      description: 'Lampadaire supprimé',
    });
    return true;
  };

  return {
    lampadaires,
    loading,
    fetchLampadaires,
    addLampadaire,
    updateLampadaire,
    deleteLampadaire,
  };
}

export function useSignalements() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSignalements();
  }, []);

  const fetchSignalements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('signalements')
      .select(`
        *,
        lampadaire:lampadaires(*),
        profile:profiles!signalements_user_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching signalements:', error);
    } else {
      setSignalements(data as unknown as Signalement[]);
    }
    setLoading(false);
  };

  const createSignalement = async (
    lampadaireId: string,
    userId: string,
    cause: string,
    description: string | null,
    photoUrl: string
  ) => {
    const { data, error } = await supabase
      .from('signalements')
      .insert({
        lampadaire_id: lampadaireId,
        user_id: userId,
        cause,
        description,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le signalement',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Signalement envoyé',
      description: 'Votre signalement est en attente de validation',
    });
    await fetchSignalements();
    return data;
  };

  const processSignalement = async (
    id: string,
    status: 'approved' | 'rejected',
    adminId: string,
    adminNotes?: string
  ) => {
    const { error } = await supabase
      .from('signalements')
      .update({
        status,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter le signalement',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Succès',
      description: status === 'approved' ? 'Signalement approuvé' : 'Signalement rejeté',
    });
    await fetchSignalements();
    return true;
  };

  return {
    signalements,
    loading,
    fetchSignalements,
    createSignalement,
    processSignalement,
  };
}

export function useLampadaireHistory() {
  const [history, setHistory] = useState<LampadaireHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lampadaire_history')
      .select(`
        *,
        lampadaire:lampadaires(*)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setHistory(data as unknown as LampadaireHistory[]);
    }
    setLoading(false);
  };

  const addHistory = async (historyEntry: Omit<LampadaireHistory, 'id' | 'created_at' | 'lampadaire'>) => {
    const { error } = await supabase
      .from('lampadaire_history')
      .insert(historyEntry);

    if (!error) {
      await fetchHistory();
    }
    return !error;
  };

  const deleteHistory = async (id: string) => {
    const { error } = await supabase
      .from('lampadaire_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'intervention',
        variant: 'destructive',
      });
      return false;
    }

    setHistory(prev => prev.filter(h => h.id !== id));
    toast({
      title: 'Succès',
      description: 'Intervention supprimée',
    });
    return true;
  };

  return {
    history,
    loading,
    fetchHistory,
    addHistory,
    deleteHistory,
  };
}
