import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    position: 'relative',
  },
  header: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  searchButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  map: {
    width: '100%',
    height: '500px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '20px',
    position: 'relative',
  },
  info: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  userList: {
    marginTop: '15px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  selectedUser: {
    backgroundColor: '#f0f9ff',
    cursor: 'pointer',
    borderLeft: '4px solid #007bff',
  },
  eta: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#666',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  directions: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  directionsInfo: {
    marginTop: '10px',
  },
  steps: {
    marginTop: '15px',
  },
  step: {
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepDistance: {
    color: '#666',
    fontSize: '0.9em',
  },
  loading: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  trackingControls: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 1,
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  progressBar: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    height: '4px',
    backgroundColor: '#ddd',
    borderRadius: '2px',
    overflow: 'hidden',
    zIndex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  '@global': {
    '.pac-container': {
      backgroundColor: '#fff',
      position: 'absolute',
      zIndex: 1000,
      borderRadius: '2px',
      border: '1px solid #ccc',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
      fontSize: '14px',
      padding: '5px 0',
      marginTop: '2px',
    },
    '.pac-item': {
      padding: '8px 15px',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#f5f5f5',
      },
    },
    '.pac-item-selected': {
      backgroundColor: '#f5f5f5',
    },
    '.pac-matched': {
      fontWeight: 'bold',
    },
  },
};

const LocationTracker = () => {
  const [userId] = useState(`user-${Math.floor(Math.random() * 1000000)}`);
  const [userLocation, setUserLocation] = useState(null);
  const [otherLocations, setOtherLocations] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [etaInfo, setEtaInfo] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [routeProgress, setRouteProgress] = useState(0);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef(new Map());
  const markerRefs = useRef(new Map());
  const wsRef = useRef(null);
  const geocoderRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const watchPositionId = useRef(null);

  // Helper Functions
  const createLocationMarker = () => {
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  };
  const calculateETA = async (origin, destination) => {
    if (!directionsServiceRef.current) return null;

    return new Promise((resolve, reject) => {
      directionsServiceRef.current.route(
        {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            resolve(result.routes[0].legs[0].duration.text);
          } else {
            reject(new Error('Failed to calculate ETA'));
          }
        }
      );
    });
  };
  const createAccuracyCircle = (position, accuracy) => {
    return new window.google.maps.Circle({
      map: googleMapRef.current,
      center: position,
      radius: accuracy,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      strokeColor: '#4285F4',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });
  };

  const animateMarkerMovement = (marker, newPosition, duration = 1500) => {
    const startPosition = marker.getPosition();
    const startLat = startPosition.lat();
    const startLng = startPosition.lng();
    const endLat = newPosition.lat;
    const endLng = newPosition.lng;

    const frames = Math.round(duration / 16.7); // 60fps
    let frame = 0;

    const animate = () => {
      frame++;
      const progress = frame / frames;

      const lat = startLat + (endLat - startLat) * progress;
      const lng = startLng + (endLng - startLng) * progress;

      marker.setPosition({ lat, lng });

      if (frame < frames) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };
  const calculateETAForAll = async (destination) => {
    const newEtaInfo = new Map();

    if (userLocation) {
      try {
        const eta = await calculateETA(userLocation, destination);
        if (eta) newEtaInfo.set(userId, eta);
      } catch (error) {
        console.error('Error calculating ETA:', error);
      }
    }

    for (const [otherId, location] of otherLocations) {
      try {
        const eta = await calculateETA(location, destination);
        if (eta) newEtaInfo.set(otherId, eta);
      } catch (error) {
        console.error('Error calculating ETA:', error);
      }
    }

    setEtaInfo(newEtaInfo);
  };
  const updateDestinationMarker = (location) => {
    if (!isMapInitialized) return;

    if (markersRef.current.has('destination')) {
      markersRef.current.get('destination').setMap(null);
    }

    const marker = new window.google.maps.Marker({
      position: location,
      map: googleMapRef.current,
      title: 'Destination',
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#4CAF50',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }
    });
    markersRef.current.set('destination', marker);
  };

  const updateRouteProgress = (currentLocation) => {
    if (!directions || !currentLocation) return;

    const route = directions.steps.map(step => ({
      lat: step.start_location.lat(),
      lng: step.start_location.lng()
    }));

    let minDistance = Infinity;
    let progressIndex = 0;

    route.forEach((point, index) => {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(currentLocation),
        new window.google.maps.LatLng(point)
      );

      if (distance < minDistance) {
        minDistance = distance;
        progressIndex = index;
      }
    });

    const progress = (progressIndex / route.length) * 100;
    setRouteProgress(progress);
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentPosition(location);
        setUserLocation(location);
        updateUserLocation(location, position.coords.accuracy);

        if (directions) {
          updateRouteProgress(location);
        }
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        setIsTracking(false);
      },
      options
    );
  };

  const stopLocationTracking = () => {
    if (watchPositionId.current) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
    }
    setIsTracking(false);
  };

  const updateUserLocation = (location, accuracy) => {
    if (wsRef.current?.connected) {
      wsRef.current.emit('updateLocation', {
        userId: userId,
        location: location,
        accuracy: accuracy
      });
    }

    if (markerRefs.current.has(userId)) {
      const marker = markerRefs.current.get(userId);
      animateMarkerMovement(marker, location);
    } else {
      const marker = new window.google.maps.Marker({
        position: location,
        map: googleMapRef.current,
        icon: createLocationMarker(),
        title: 'Your Location'
      });
      markerRefs.current.set(userId, marker);
    }

    if (accuracy) {
      if (markerRefs.current.has(`${userId}-accuracy`)) {
        markerRefs.current.get(`${userId}-accuracy`).setCenter(location);
        markerRefs.current.get(`${userId}-accuracy`).setRadius(accuracy);
      } else {
        const accuracyCircle = createAccuracyCircle(location, accuracy);
        markerRefs.current.set(`${userId}-accuracy`, accuracyCircle);
      }
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      setIsLoading(false);

      if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
        const location = results[0].geometry.location;
        const newLocation = {
          lat: location.lat(),
          lng: location.lng(),
        };

        setSelectedLocation(newLocation);
        googleMapRef.current.setCenter(newLocation);
        updateDestinationMarker(newLocation);
        calculateETAForAll(newLocation);
        setSearchQuery(results[0].formatted_address);
      } else {
        setError('Location not found. Please try again.');
      }
    });
  };

  const handleUserClick = async (selectedId, userLoc) => {
    setSelectedUser(selectedId);

    if (!selectedLocation) {
      setError('Please search for a destination first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await new Promise((resolve, reject) => {
        directionsServiceRef.current.route(
          {
            origin: userLoc,
            destination: selectedLocation,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              resolve(result);
            } else {
              switch (status) {
                case window.google.maps.DirectionsStatus.NOT_FOUND:
                  reject(new Error('One or more locations could not be found'));
                  break;
                case window.google.maps.DirectionsStatus.ZERO_RESULTS:
                  reject(new Error('No route could be found between the origin and destination'));
                  break;
                case window.google.maps.DirectionsStatus.REQUEST_DENIED:
                  reject(new Error('Directions request denied. Please check API key configuration'));
                  break;
                case window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
                  reject(new Error('Direction service quota exceeded. Please try again later'));
                  break;
                default:
                  reject(new Error('Error calculating directions'));
              }
            }
          }
        );
      });

      directionsRendererRef.current.setDirections(result);
      setDirections(result.routes[0].legs[0]);

      if (!isTracking) {
        startLocationTracking();
      }
    } catch (error) {
      setError(error.message);
      directionsRendererRef.current.setDirections(null);
      setDirections(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize map and socket connection
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      return new Promise((resolve, reject) => {
        if (window.google) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCX2WEyvUBpE65Q1LSzkIXWiDT5YntyMYE&libraries=places,directions,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
        
      });
    };
    const initializeWebSocket = () => {
      try {
        wsRef.current = io('http://localhost:5000', {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        wsRef.current.on('connect', () => {
          console.log('Socket.IO connected');
          wsRef.current.emit('register', userId);
        });

        wsRef.current.on('locationUpdate', (data) => {
          if (data.userId !== userId) {
            setOtherLocations(prev => new Map(prev.set(data.userId, data.location)));
          }
        });

        wsRef.current.on('connect_error', (error) => {
          setError(`Connection error: ${error.message}`);
        });

        wsRef.current.on('disconnect', () => {
          console.log('Socket.IO disconnected');
        });
      } catch (error) {
        setError(`Failed to initialize Socket.IO: ${error.message}`);
      }
    };
    const initializeMap = async () => {
      if (!mapRef.current || !window.google) return;

      try {
        const defaultLocation = { lat: 0, lng: 0 };
        const mapOptions = {
          zoom: 13,
          center: userLocation || defaultLocation,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        };

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        directionsServiceRef.current = new window.google.maps.DirectionsService();
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: googleMapRef.current,
          suppressMarkers: true,
        });
        geocoderRef.current = new window.google.maps.Geocoder();

        // Add Autocomplete
        const input = document.getElementById('location-search');
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          types: ['geocode', 'establishment'], // This allows both addresses and places
          fields: ['formatted_address', 'geometry', 'name'], // Specify what data to return
        });

        // Bind Autocomplete to the map's bounds (optional)
        autocomplete.bindTo('bounds', googleMapRef.current);

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            setError('No details available for this place');
            return;
          }

          const newLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setSelectedLocation(newLocation);
          setSearchQuery(place.formatted_address || place.name);
          googleMapRef.current.setCenter(newLocation);
          googleMapRef.current.setZoom(17); // Zoom in when place is selected
          updateDestinationMarker(newLocation);
          calculateETAForAll(newLocation);
        });
      } catch (error) {
        setError(`Error initializing map: ${error.message}`);
      }
    };

    const initialize = async () => {
      try {
        await loadGoogleMapsScript();
        await initializeMap();
        setIsMapInitialized(true);
        initializeWebSocket();
        startLocationTracking();
      } catch (error) {
        setError(`Initialization error: ${error.message}`);
      }
    };

    initialize();

    return () => {
      stopLocationTracking();
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      {isLoading && (
        <div style={styles.loading}>
          {selectedUser ? 'Calculating directions...' : 'Searching location...'}
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>
          <MapPin size={24} />
          Location Tracker
        </h1>
        <div style={styles.searchContainer}>
          <input
            id="location-search"
            type="text"
            placeholder="Search for a destination..."
            style={styles.searchInput}
            onChange={(e) => setSearchQuery(e.target.value)}
          // Remove the value prop to allow Autocomplete to work
          />
          <button
            style={styles.searchButton}
            onClick={handleSearch}
            disabled={isLoading}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.map}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        <div style={styles.trackingControls}>
          <button
            style={{
              ...styles.button,
              backgroundColor: isTracking ? '#dc3545' : '#28a745'
            }}
            onClick={isTracking ? stopLocationTracking : startLocationTracking}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>

        {directions && (
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${routeProgress}%`
              }}
            />
            <span style={styles.progressText}>
              {Math.round(routeProgress)}% of route completed
            </span>
          </div>
        )}
      </div>

      <div style={styles.info}>
        <h2>Connected Users</h2>
        <div style={styles.userList}>
          <div
            style={{ ...styles.userItem, ...(selectedUser === userId ? styles.selectedUser : {}) }}
            onClick={() => handleUserClick(userId, userLocation)}
          >
            <span>You (ID: {userId})</span>
            {etaInfo.has(userId) && (
              <span style={styles.eta}>
                <Clock size={16} />
                ETA: {etaInfo.get(userId)}
              </span>
            )}
          </div>
          {Array.from(otherLocations).map(([otherId, location]) => (
            <div
              key={otherId}
              style={{ ...styles.userItem, ...(selectedUser === otherId ? styles.selectedUser : {}) }}
              onClick={() => handleUserClick(otherId, location)}
            >
              <span>User {otherId}</span>
              {etaInfo.has(otherId) && (
                <span style={styles.eta}>
                  <Clock size={16} />
                  ETA: {etaInfo.get(otherId)}
                </span>
              )}
            </div>
          ))}
        </div>

        {directions && (
          <div style={styles.directions}>
            <h3>Directions</h3>
            <div style={styles.directionsInfo}>
              <p><strong>Distance:</strong> {directions.distance.text}</p>
              <p><strong>Duration:</strong> {directions.duration.text}</p>
              <div style={styles.steps}>
                {directions.steps.map((step, index) => (
                  <div key={index} style={styles.step}>
                    <span dangerouslySetInnerHTML={{ __html: step.instructions }} />
                    <span style={styles.stepDistance}>({step.distance.text})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTracker;