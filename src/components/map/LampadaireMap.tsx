import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Lampadaire } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Locate, Layers } from 'lucide-react';

interface LampadaireMapProps {
  lampadaires: Lampadaire[];
  onLampadaireClick?: (lampadaire: Lampadaire) => void;
  selectedLampadaire?: Lampadaire | null;
  showUserLocation?: boolean;
}

const TILE_LAYERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> - World Imagery',
  },
};

export default function LampadaireMap({
  lampadaires,
  onLampadaireClick,
  selectedLampadaire,
  showUserLocation = true,
}: LampadaireMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const initialBoundsSet = useRef(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [14.6937, -17.4441], // Dakar
      zoom: 13,
      zoomControl: true,
    });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
    }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Switch tile layer when style changes
  useEffect(() => {
    if (!map.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const layer = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
    }).addTo(map.current);
  }, [mapStyle]);

  // Update markers when lampadaires change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    lampadaires.forEach((lampadaire) => {
      const markerColor = lampadaire.status === 'functional' ? '#22c55e' : '#ef4444';
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${markerColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ${selectedLampadaire?.id === lampadaire.id ? 'transform: scale(1.3);' : ''}
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lampadaire.latitude, lampadaire.longitude], { icon })
        .addTo(map.current!);

      marker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>${lampadaire.identifier}</strong><br/>
          <span style="color: ${markerColor};">
            ${lampadaire.status === 'functional' ? '✓ Fonctionnel' : '✗ Endommagé'}
          </span>
        </div>
      `);

      marker.on('click', () => {
        if (onLampadaireClick) {
          onLampadaireClick(lampadaire);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds only on initial load
    if (lampadaires.length > 0 && !initialBoundsSet.current) {
      const bounds = L.latLngBounds(
        lampadaires.map(l => [l.latitude, l.longitude])
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
      initialBoundsSet.current = true;
    }
  }, [lampadaires, onLampadaireClick, selectedLampadaire]);

  // Handle user location
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);

        if (map.current) {
          // Remove existing user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          // Add user marker
          const userIcon = L.divIcon({
            className: 'user-marker',
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(map.current)
            .bindPopup('Votre position');

          map.current.setView([latitude, longitude], 16);
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        alert('Impossible d\'obtenir votre position');
      }
    );
  };

  const toggleMapStyle = () => {
    setMapStyle(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  // Center on selected lampadaire without changing zoom
  useEffect(() => {
    if (selectedLampadaire && map.current) {
      map.current.panTo([selectedLampadaire.latitude, selectedLampadaire.longitude]);
    }
  }, [selectedLampadaire]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Layer toggle button */}
        <Button
          variant="secondary"
          size="icon"
          className="shadow-lg"
          onClick={toggleMapStyle}
          title={mapStyle === 'standard' ? 'Vue satellite' : 'Vue standard'}
        >
          <Layers className="h-4 w-4" />
        </Button>

        {/* Location button */}
        {showUserLocation && (
          <Button
            variant="secondary"
            size="icon"
            className="shadow-lg"
            onClick={locateUser}
          >
            <Locate className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
