/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Plane, Bed, Flag, Ship, Search, Loader2, Navigation, Utensils, TramFront, Home, RotateCcw, Compass, Palette, Flower, Music } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { Map, Marker, Popup, Source, Layer, NavigationControl, FullscreenControl } from '@vis.gl/react-mapbox';
import { mockDatabase } from '@/lib/mockDatabase';
import mapConfigDefault from "@config/ui/map.json";

const iconMap = { MapPin, Plane, Bed, Flag, TramFront, Utensils, Home, Compass, Palette, Flower, Music };

export default function MapSection() {
  const reduceMotion = useReducedMotion();
  const [mapError, setMapError] = useState('');
  const [config, setConfig] = useState(mapConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("map", mapConfigDefault).then(setConfig);
  }, []);

  const baseLocations = config.locations.map((loc: any) => ({
    ...loc,
    icon: iconMap[loc.icon as keyof typeof iconMap] || MapPin
  }));

  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isOpenByHover, setIsOpenByHover] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState<any>(null);

  const handleMarkerEnter = (loc: any) => {
    // Coarse pointer devices (touchscreens/mobile) should bypass hover open/close
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setSelectedLocation(loc);
    setIsOpenByHover(true);
  };

  const handleMarkerLeave = () => {
    if (!isOpenByHover) return; // Don't close if it was explicitly clicked/pinned
    const timeout = setTimeout(() => {
      setSelectedLocation(null);
    }, 600); // 600ms gives user plenty of time to move mouse into popup
    setCloseTimeout(timeout);
  };

  const handlePopupEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  const handlePopupLeave = () => {
    if (!isOpenByHover) return;
    const timeout = setTimeout(() => {
      setSelectedLocation(null);
    }, 200);
    setCloseTimeout(timeout);
  };

  const handleMarkerClick = (loc: any) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setSelectedLocation(loc);
    setIsOpenByHover(false); // Pin the popup open
  };

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [input, setInput] = useState('');

  // Dedicated Map AI Chat
  const [mapRef, setMapRef] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [routeData, setRouteData] = useState<any>(null);

  // Dynamic origin state variables
  const [originLocation, setOriginLocation] = useState<any>(() => {
    const venue = baseLocations.find(l => l.id === 'venue');
    return venue ? { id: 'venue', name: venue.name, lat: venue.lat, lng: venue.lng } : {
      id: 'venue',
      name: 'The Bougainvillea Estate',
      lat: 33.682,
      lng: -116.237
    };
  });
  const [customOriginInput, setCustomOriginInput] = useState('');
  const [activeDestination, setActiveDestination] = useState<any>(null);

  const [isChatExpanded, setIsChatExpanded] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsChatExpanded(window.innerWidth >= 768);
    }
  }, []);

  const { messages, sendMessage, status, setMessages, error, regenerate, clearError, stop } = useChat({
    id: 'map-explorer',
    transport: new DefaultChatTransport({ api: '/api/map-chat' })
  });
  const isLoading = status === 'streaming' || status === 'submitted';

  const handleLocateMe = () => {
    setMapError('');
    if (!navigator.geolocation) { setMapError('Your browser does not support location. Enter a starting address instead.'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(coords);
      mapRef?.flyTo({ center: [coords.lng, coords.lat], zoom: 14, duration: reduceMotion ? 0 : 1200 });
    }, () => setMapError('Your location is unavailable. Enter a starting address instead.'), { timeout: 10000 });
  };

  const handleGoHome = () => {
    const venue = baseLocations.find(l => l.id === 'venue');
    const center = venue ? [venue.lng, venue.lat] : [-116.237, 33.682];
    mapRef?.flyTo({ center, zoom: 15, duration: reduceMotion ? 0 : 1200, pitch: 45 });
  };

  const handleResetView = () => {
    stop();
    clearError();
    setMapError('');
    // 1. Reset map viewport to original state
    const defaultCenter = config.center;
    mapRef?.flyTo({ center: defaultCenter, zoom: config.zoom || 10, duration: reduceMotion ? 0 : 1200, pitch: 45 });
    
    // 2. Reset chatbot messages and text input
    setMessages([]);
    setInput('');
    
    // 3. Clear routes, destination, and selected marker states
    setRouteData(null);
    setActiveDestination(null);
    setSelectedLocation(null);
    setUserLocation(null);
    
    // 4. Reset custom origin to defaults
    const venue = baseLocations.find(l => l.id === 'venue');
    setOriginLocation(venue ? { id: 'venue', name: venue.name, lat: venue.lat, lng: venue.lng } : {
      id: 'venue',
      name: 'The Bougainvillea Estate',
      lat: 33.682,
      lng: -116.237
    });
    
    // 5. Clear AI geocoded markers
    setAiLocations([]);
  };

  const handleManualSubmit = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isLoading || !input || !input.trim()) return;
    clearError();
    sendMessage({ text: input });
    setInput('');
  };



  const handleGetDirections = async (dest: { lat: number, lng: number, name?: string }, customOrigin?: { lat: number, lng: number }) => {
    if (!token) return;
    setMapError('');
    setRouteData(null);
    setActiveDestination(dest);
    const origin = customOrigin || originLocation;
    const coordsString = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${token}`;
    
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Map service unavailable');
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRouteData(data.routes[0].geometry);
        // Fly to show both with smart padding to avoid overlapping UI panels
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const padding = isMobile
          ? { top: 120, bottom: 220, left: 40, right: 40 }
          : { top: 100, bottom: 100, left: 260, right: 360 };

        mapRef?.fitBounds([
          [Math.min(origin.lng, dest.lng) - 0.02, Math.min(origin.lat, dest.lat) - 0.02],
          [Math.max(origin.lng, dest.lng) + 0.02, Math.max(origin.lat, dest.lat) + 0.02]
        ], { padding, duration: reduceMotion ? 0 : 1200 });
      } else { setMapError('No driving route was found. Try another starting address.'); }
    } catch (err) {
      setMapError('Directions are temporarily unavailable. Please try again.');
    }
  };

  const handleGeocodeCustomOrigin = async () => {
    if (!customOriginInput.trim() || !token) return;
    setMapError('');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(customOriginInput)}.json?access_token=${token}&limit=1`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Map service unavailable');
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feat = data.features[0];
        const [lng, lat] = feat.center;
        const newOrigin = { id: 'custom', name: feat.place_name, lat, lng };
        setOriginLocation(newOrigin);
        if (activeDestination) {
          handleGetDirections(activeDestination, newOrigin);
        } else if (selectedLocation) {
          handleGetDirections(selectedLocation, newOrigin);
        }
      }
    } catch (err) {
      setMapError('We could not find that address. Please try a more complete address.');
    }
  };



  const [aiLocations, setAiLocations] = useState<any[]>([]);

  // Parse AI tools to extract mapping data
  useEffect(() => {
    let newPins: any[] = [];
    let latestRoute: any = null;
    let latestOrigin: any = null;
    let latestDest: any = null;

    messages.forEach((m: any) => {
      const toolCallsToProcess: Array<{ toolName: string; toolCallId: string; result: any }> = [];

      if (m.toolInvocations) {
        m.toolInvocations.forEach((t: any) => {
          if ('result' in t) {
            toolCallsToProcess.push({
              toolName: t.toolName,
              toolCallId: t.toolCallId,
              result: t.result
            });
          }
        });
      }

      if (m.parts) {
        m.parts.forEach((p: any) => {
          if (p.type && p.type.startsWith('tool-') && ('output' in p || 'result' in p)) {
            const toolName = p.type.replace('tool-', '');
            toolCallsToProcess.push({
              toolName,
              toolCallId: p.toolCallId,
              result: p.output || p.result
            });
          } else if (p.type === 'dynamic-tool' && ('output' in p || 'result' in p)) {
            toolCallsToProcess.push({
              toolName: p.toolName,
              toolCallId: p.toolCallId,
              result: p.output || p.result
            });
          }
        });
      }

      toolCallsToProcess.forEach(({ toolName, toolCallId, result }) => {
        if (!result) return;

        if (toolName === 'geocodePlaces') {
          if (result.found && result.results) {
            const mappedResults = result.results.map((r: any) => ({
              ...r,
              type: 'AI_Search',
              icon: Navigation,
              color: '#F97316' // Orange color for AI pins
            }));
            newPins = [...newPins, ...mappedResults];
          }
        }
        
        if (toolName === 'getDirections') {
          if (result.found && result.geometry) {
            latestRoute = result.geometry;
            
            if (result.originCoords) {
              latestOrigin = {
                id: `ai-origin-${toolCallId}`,
                name: result.origin || 'Route Start',
                lat: result.originCoords.lat,
                lng: result.originCoords.lng
              };
              newPins.push({
                id: `route-start-${toolCallId}`,
                name: result.origin || 'Route Start',
                lat: result.originCoords.lat,
                lng: result.originCoords.lng,
                type: 'AI_Search',
                icon: Navigation,
                color: '#10B981' // Green for start
              });
            }
            
            if (result.destinationCoords) {
              latestDest = {
                id: `ai-dest-${toolCallId}`,
                name: result.destination || 'Route Destination',
                lat: result.destinationCoords.lat,
                lng: result.destinationCoords.lng
              };
              newPins.push({
                id: `route-end-${toolCallId}`,
                name: result.destination || 'Route Destination',
                lat: result.destinationCoords.lat,
                lng: result.destinationCoords.lng,
                type: 'AI_Search',
                icon: MapPin,
                color: '#EF4444' // Red for end
              });
            }
          }
        }
      });
    });

    if (latestRoute) {
      if (JSON.stringify(routeData) !== JSON.stringify(latestRoute)) {
        setRouteData(latestRoute);
      }
      if (latestOrigin && originLocation?.id !== latestOrigin.id) {
        setOriginLocation(latestOrigin);
      }
      if (latestDest && activeDestination?.id !== latestDest.id) {
        setActiveDestination(latestDest);
        
        // Fit bounds to show the route if mapRef is available, using smart padding to avoid UI panels
        if (latestOrigin?.lat && latestDest?.lat && mapRef && typeof mapRef.fitBounds === 'function') {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const padding = isMobile
            ? { top: 120, bottom: 220, left: 40, right: 40 }
            : { top: 100, bottom: 100, left: 260, right: 360 };

          mapRef.fitBounds([
            [Math.min(latestOrigin.lng, latestDest.lng) - 0.02, Math.min(latestOrigin.lat, latestDest.lat) - 0.02],
            [Math.max(latestOrigin.lng, latestDest.lng) + 0.02, Math.max(latestOrigin.lat, latestDest.lat) + 0.02]
          ], { padding, duration: reduceMotion ? 0 : 1200 });
        }
      }
    }

    // Remove strict duplicates by ID
    const uniquePins = newPins.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    const pinsChanged = JSON.stringify(aiLocations.map(p => p.id)) !== JSON.stringify(uniquePins.map(p => p.id));
    
    if (pinsChanged) {
      setAiLocations(uniquePins);
      
      // Auto zoom/focus map on newly discovered search pins
      if (uniquePins.length > 0 && mapRef) {
        if (uniquePins.length === 1) {
          mapRef.flyTo({
            center: [uniquePins[0].lng, uniquePins[0].lat],
            zoom: 14,
            duration: reduceMotion ? 0 : 1200
          });
        } else {
          const lngs = uniquePins.map(p => p.lng);
          const lats = uniquePins.map(p => p.lat);
          
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const padding = isMobile
            ? { top: 120, bottom: 220, left: 40, right: 40 }
            : { top: 100, bottom: 100, left: 260, right: 360 };

          mapRef.fitBounds([
            [Math.min(...lngs) - 0.015, Math.min(...lats) - 0.015],
            [Math.max(...lngs) + 0.015, Math.max(...lats) + 0.015]
          ], { padding, duration: reduceMotion ? 0 : 1200 });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, mapRef, aiLocations]);

  const allLocations = [...baseLocations, ...aiLocations];

  if (!token) return <div className="min-h-64 p-8 flex items-center justify-center bg-surface-muted border border-line text-muted font-sans text-center">The interactive map is temporarily unavailable. You can still use the venue and hotel links above for directions.</div>;

  return (
    <div className="w-full h-[450px] sm:h-[520px] lg:h-[600px] relative rounded-sm overflow-hidden shadow-card ring-1 ring-line">
      <Map
        ref={(ref: any) => setMapRef(ref?.getMap())}
        initialViewState={{
          latitude: 33.70,
          longitude: -116.42,
          zoom: 10,
          pitch: 45
        }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={token}
        scrollZoom={false}
        attributionControl={false}
        onClick={() => setSelectedLocation(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <FullscreenControl position="top-right" />

        {allLocations.map((loc) => {
          const IconComponent = loc.icon;
          const isSelected = selectedLocation?.id === loc.id;
          
          return (
            <Marker
              key={loc.id}
              latitude={loc.lat}
              longitude={loc.lng}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(loc);
              }}
            >
              <motion.div
                role="button"
                tabIndex={0}
                aria-label={loc.name}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleMarkerClick(loc); }
                  if (event.key === 'Escape') setSelectedLocation(null);
                }}
                className={`cursor-pointer relative flex flex-col items-center group ${loc.type === 'AI_Search' ? 'z-20' : 'z-10'}`}
                whileHover={{ scale: 1.2 }}
                animate={{ scale: isSelected ? 1.3 : 1 }}
                onMouseEnter={() => handleMarkerEnter(loc)}
                onMouseLeave={handleMarkerLeave}
              >
                <div 
                  className="relative z-10 p-2 rounded-full border border-black/10 shadow-card"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    color: loc.color 
                  }}
                >
                  <IconComponent size={loc.type === 'Venue' ? 24 : 18} strokeWidth={2} />
                </div>
                
                <div className="w-[2px] h-4 bg-gradient-to-b from-black/30 to-transparent mt-1" />
              </motion.div>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full" />
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-card relative z-10" />
            </div>
          </Marker>
        )}

        {routeData && (
          <Source id="route-source" type="geojson" data={{
            type: 'Feature',
            geometry: routeData
          } as any}>
            <Layer
              id="route-layer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#10B981',
                'line-width': 4,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {selectedLocation && (
          <Popup
            latitude={selectedLocation.lat}
            longitude={selectedLocation.lng}
            onClose={() => setSelectedLocation(null)}
            closeButton={false}
            anchor="bottom"
            offset={30}
            className="rounded-sm overflow-hidden wedding-map-popup"
            style={{ 
              '--popup-bg': 'var(--color-surface)',
              '--popup-border': 'var(--color-line)'
            } as any}
          >
            <div 
              onMouseEnter={handlePopupEnter}
              onMouseLeave={handlePopupLeave}
              className="p-3 backdrop-blur-xl bg-surface/95 border border-line rounded-sm shadow-floating min-w-[180px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <selectedLocation.icon size={14} style={{ color: selectedLocation.color }} />
                <p className="font-sans text-label uppercase tracking-label text-muted">
                  {selectedLocation.type === 'AI_Search' ? 'Discovered' : selectedLocation.type}
                </p>
              </div>
              <p className="font-sans font-medium text-charcoal text-copy mb-3">{selectedLocation.name}</p>
              
              <div className="flex gap-1.5 pt-3 border-t border-line">
                <button 
                  onClick={() => {
                    handleGetDirections({ lat: selectedLocation.lat, lng: selectedLocation.lng, name: selectedLocation.name });
                    setSelectedLocation(null);
                  }}
                  className="flex-1 flex flex-col items-center justify-center bg-surface-muted text-olive py-2 rounded-sm hover:bg-sage/20 transition-colors border border-line"
                >
                  <Navigation size={12} className="mb-0.5" />
                  <span className="text-label font-sans font-semibold uppercase tracking-tighter">DIR</span>
                </button>
                <a 
                  href={`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${selectedLocation.lat}&dropoff[longitude]=${selectedLocation.lng}&dropoff[nickname]=${encodeURIComponent(selectedLocation.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center bg-surface-muted text-charcoal py-2 rounded-sm hover:bg-sage/20 transition-colors border border-line"
                  title="Request Uber"
                >
                  <span className="text-label font-sans font-semibold">UBER</span>
                </a>
                <a 
                  href={`https://lyft.com/ride?id=lyft&destination[latitude]=${selectedLocation.lat}&destination[longitude]=${selectedLocation.lng}&destination[address]=${encodeURIComponent(selectedLocation.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center bg-surface-muted text-action py-2 rounded-sm hover:bg-sage/20 transition-colors border border-line"
                  title="Request Lyft"
                >
                  <span className="text-label font-sans font-semibold">LYFT</span>
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>
      
      {/* Dynamic Glassmorphic Legend */}
      <div className="hidden md:block absolute top-6 left-6 bg-surface/95 backdrop-blur-xl p-5 border border-line rounded-sm shadow-floating max-w-[220px]">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-olive" />
          <h4 className="font-sans uppercase tracking-label text-charcoal font-semibold text-xs">Directory</h4>
        </div>
        
        <div className="space-y-3">
            {[
              { type: 'Venue', color: '#D91C5C', label: 'The Estate' },
              { type: 'Hotel', color: '#38BDF8', label: 'Accommodations' },
              { type: 'Airport', color: '#64748B', label: 'Transit' },
              { type: 'Restaurant', color: '#EF4444', label: 'Dining' },
              { type: 'Golf', color: '#10B981', label: 'Golf Courses' },
              { type: 'Activities', color: '#8B5CF6', label: 'Activities' },
              ...(aiLocations.length > 0 ? [{ type: 'AI_Search', color: '#F97316', label: 'Discovered' }] : [])
            ].map((cat) => (
              <button type="button"
                key={cat.type}
                className="flex items-center space-x-3 cursor-pointer hover:bg-surface-muted p-1.5 rounded-sm transition-colors group"
                onClick={() => {
                  const loc = allLocations.find(l => l.type === cat.type);
                  if (loc) setSelectedLocation(loc);
                }}
              >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="font-sans text-xs tracking-normal text-charcoal/80 group-hover:text-charcoal transition-colors">{cat.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Map Explorer AI Chatbox */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 md:left-auto md:right-6 md:w-[320px] bg-surface/95 backdrop-blur-2xl border border-line rounded-sm shadow-floating overflow-hidden flex flex-col">
        <div className="p-4 bg-surface-muted border-b border-line flex items-center justify-between">
          <button type="button" aria-expanded={isChatExpanded} aria-controls="map-explorer-content" onClick={() => setIsChatExpanded(value => !value)} className="flex items-center gap-2 text-left">
            <Search size={14} className="text-olive" />
            <h3 className="font-sans text-xs uppercase tracking-label text-olive font-semibold text-balance">
              Map Explorer
              {!isChatExpanded && <span className="md:hidden text-label font-sans font-normal text-olive lowercase tracking-normal ml-2">(tap to open)</span>}
            </h3>
          </button>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={handleLocateMe}
              className="p-1.5 hover:bg-surface-muted rounded-sm transition-colors text-olive group"
              title="Find me on map"
            >
              <Navigation size={14} className="group-hover:animate-pulse" />
            </button>
            <button 
              onClick={handleGoHome}
              className="p-1.5 hover:bg-surface-muted rounded-sm transition-colors text-olive group"
              title="Return to the Estate"
            >
              <Home size={14} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={handleResetView}
              className="p-1.5 hover:bg-surface-muted rounded-sm transition-colors text-olive group"
              title="Reset view to default"
            >
              <RotateCcw size={14} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>
        
        {mapError && <p role="alert" className="px-4 py-3 text-caption text-danger">{mapError}</p>}
        {isChatExpanded && (
          <div id="map-explorer-content">
            <div className="p-4 max-h-[150px] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-black/10">
              {messages.filter((m: any) => m.role !== 'system').length === 0 ? (
                <p className="font-sans text-copy leading-relaxed text-muted">
                  Ask me to find anything near the desert venues.<br/>
                  <span className="text-muted mt-1 block">Try: "Find tacos nearby" or "Where is a pharmacy?"</span>
                </p>
              ) : (
                messages.filter((m: any) => m.role !== 'system').map((m: any) => {
                  const textContent = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || m.content;
                  return (
                    <div key={m.id} className={`font-sans text-sm leading-relaxed ${m.role === 'user' ? 'text-charcoal text-right' : 'text-olive'}`}>
                      {textContent || (m.toolInvocations ? <span className="flex items-center gap-2 italic text-muted"><Loader2 size={10} className="animate-spin" /> Plotting findings...</span> : '')}
                    </div>
                  );
                })
              )}
              {isLoading && messages[messages.length-1]?.role === 'user' && (
                <div className="font-sans text-caption text-olive flex items-center gap-2">
                  <Loader2 size={10} className="animate-spin" /> Searching the grid...
                </div>
              )}
            </div>

            {error && <p role="alert" className="px-4 pb-3 text-caption text-danger">Map search couldn't connect. <button disabled={isLoading} onClick={() => { clearError(); regenerate(); }} className="underline underline-offset-4">Try again</button></p>}
            <form onSubmit={handleManualSubmit} className="border-t border-line bg-surface p-2">
              <input 
                value={input || ""}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search map..." aria-label="Ask Map Explorer" maxLength={2000} disabled={isLoading}
                className="w-full bg-transparent text-charcoal font-sans text-base placeholder:text-muted outline-none px-3 py-2"
              />
            </form>
          </div>
        )}
      </div>

      {/* Route Directions Panel */}
      <AnimatePresence>
        {routeData && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-2 md:top-6 left-2 sm:left-auto right-2 sm:right-12 md:right-16 bg-surface/95 backdrop-blur-2xl border border-line rounded-sm shadow-floating p-4 w-auto sm:w-[280px] z-10 font-sans text-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex items-center gap-1.5 text-olive font-semibold uppercase tracking-label font-sans">
                <Navigation size={12} />
                <span>Directions</span>
              </div>
              <button
                onClick={() => {
                  setRouteData(null);
                  setActiveDestination(null);
                  const venue = baseLocations.find(l => l.id === 'venue');
                  setOriginLocation(venue ? { id: 'venue', name: venue.name, lat: venue.lat, lng: venue.lng } : {
                    id: 'venue',
                    name: 'The Bougainvillea Estate',
                    lat: 33.682,
                    lng: -116.237
                  });
                }}
                className="text-muted hover:text-charcoal/80 font-sans text-label uppercase tracking-label font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-label text-muted uppercase font-sans tracking-label font-semibold mb-1">Start Location</label>
                <select
                  value={originLocation.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'user' && userLocation) {
                      const newOrigin = { id: 'user', name: 'My Location', ...userLocation };
                      setOriginLocation(newOrigin);
                      if (activeDestination) handleGetDirections(activeDestination, newOrigin);
                    } else if (val === 'venue') {
                      const venue = baseLocations.find(l => l.id === 'venue');
                      const newOrigin = venue ? { id: 'venue', name: venue.name, lat: venue.lat, lng: venue.lng } : { id: 'venue', name: 'The Bougainvillea Estate', lat: 33.682, lng: -116.237 };
                      setOriginLocation(newOrigin);
                      if (activeDestination) handleGetDirections(activeDestination, newOrigin);
                    } else if (val.startsWith('ai-origin-')) {
                      if (activeDestination) handleGetDirections(activeDestination, originLocation);
                    } else {
                      const found = baseLocations.find(l => l.id === val);
                      if (found) {
                        setOriginLocation(found);
                        if (activeDestination) handleGetDirections(activeDestination, found);
                      } else if (val === 'custom') {
                        setOriginLocation({ id: 'custom', name: 'Custom Address...', lat: 0, lng: 0 });
                      }
                    }
                  }}
                  className="w-full border border-line rounded-sm p-2 text-base text-charcoal/80 bg-surface focus:outline-none focus:border-action transition-colors"
                >
                  <option value="venue">The Bougainvillea Estate (Venue)</option>
                  {userLocation && <option value="user">My Location</option>}
                  <option value="psp">Palm Springs Airport (PSP)</option>
                  <option value="laquinta">La Quinta Resort</option>
                  <option value="jwmarriott">JW Marriott Desert Springs</option>
                  <option value="esmeralda">Renaissance Esmeralda</option>
                  {originLocation?.id && typeof originLocation.id === 'string' && originLocation.id.startsWith('ai-origin-') && (
                    <option value={originLocation.id}>{originLocation.name}</option>
                  )}
                  <option value="custom">Custom Address...</option>
                </select>
              </div>

              {originLocation.id === 'custom' && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter address..."
                    aria-label="Starting address" maxLength={300} value={customOriginInput}
                    onChange={(e) => setCustomOriginInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGeocodeCustomOrigin();
                    }}
                    className="min-w-0 flex-1 border border-line rounded-sm px-2.5 py-1.5 text-base text-charcoal/80 bg-surface placeholder:text-muted focus:outline-none focus:border-action transition-colors"
                  />
                  <button
                    onClick={handleGeocodeCustomOrigin}
                    className="bg-action text-cream px-3 py-1.5 rounded-sm text-label uppercase font-semibold tracking-label hover:bg-action-hover transition-colors"
                  >
                    Go
                  </button>
                </div>
              )}

              <div>
                <label className="block text-label text-muted uppercase font-sans tracking-label font-semibold mb-0.5">Destination</label>
                <div className="font-semibold text-charcoal/80 leading-tight">
                  {activeDestination?.name}
                </div>
              </div>

              {/* External Routing Links */}
              <div className="flex gap-2 pt-2 border-t border-line">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${originLocation.lat},${originLocation.lng}&destination=${activeDestination?.lat},${activeDestination?.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 bg-surface-muted text-olive py-2 rounded-sm hover:bg-sage/20 transition-colors border border-line font-semibold text-label tracking-label uppercase font-sans"
                >
                  Google Maps
                </a>
                <a
                  href={`https://maps.apple.com/?saddr=${originLocation.lat},${originLocation.lng}&daddr=${activeDestination?.lat},${activeDestination?.lng}&dirflg=d`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 bg-surface-muted text-charcoal/80 py-2 rounded-sm hover:bg-sage/20 transition-colors border border-line font-semibold text-label tracking-label uppercase font-sans"
                >
                  Apple Maps
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Global CSS for overriding Mapbox popup default styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .wedding-map-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .wedding-map-popup .mapboxgl-popup-tip {
          border-top-color: var(--popup-bg) !important;
          backdrop-filter: blur(10px);
        }
      `}} />
    </div>
  );
}
