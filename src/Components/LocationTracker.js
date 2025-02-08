import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

const LocationTracker = () => {
    const [userId] = useState(`user-${Math.floor(Math.random() * 1000000)}`);
    const [userLocation, setUserLocation] = useState(null);
    const [dropOffLocations, setDropOffLocations] = useState([]);
    const [sortedRoute, setSortedRoute] = useState([]);
    const [directions, setDirections] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const watchPositionId = useRef(null);
    const wsRef = useRef(null);
    const markersRef = useRef([]);

    // Fetch random drop-off points
    useEffect(() => {
        fetch('http://localhost:5000/api/dropoff-locations')
            .then(response => response.json())
            .then(data => setDropOffLocations(data))
            .catch(error => console.error('Error fetching drop-off locations:', error));
    }, []);

    // Initialize Google Maps
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

        const initializeMap = async () => {
            await loadGoogleMapsScript();
            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                zoom: 13,
                center: { lat: 31.9539, lng: 35.9106 },
            });

            directionsServiceRef.current = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: googleMapRef.current,
            });

            startLocationTracking();
        };

        initializeMap();
    }, []);

    // Sort locations by nearest-to-farthest distance
    const sortByDistance = (origin, locations) => {
        return locations.map(location => ({
            ...location,
            distance: window.google.maps.geometry.spherical.computeDistanceBetween(
                new window.google.maps.LatLng(origin),
                new window.google.maps.LatLng(location)
            )
        })).sort((a, b) => a.distance - b.distance);
    };

    // Display markers for all drop-off locations
    useEffect(() => {
        if (dropOffLocations.length > 0 && googleMapRef.current) {
            markersRef.current.forEach(marker => marker.setMap(null)); // Clear old markers
            markersRef.current = [];

            dropOffLocations.forEach((location, index) => {
                const marker = new window.google.maps.Marker({
                    position: location,
                    map: googleMapRef.current,
                    label: `${index + 1}`, // Number markers from 1-5
                    title: `Drop-off Location ${index + 1}`,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: index === 0 ? '#FF0000' : '#4285F4', // Red for first, blue for others
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2
                    }
                });
                markersRef.current.push(marker);
            });

            // Fit the map to display all markers
            const bounds = new window.google.maps.LatLngBounds();
            dropOffLocations.forEach(location => bounds.extend(location));
            googleMapRef.current.fitBounds(bounds);
        }
    }, [dropOffLocations]);

    // Start navigation
    const startTrip = async () => {
        if (!userLocation || dropOffLocations.length === 0) {
            setError("Cannot start trip without current location or drop-off points.");
            return;
        }

        const sortedLocations = sortByDistance(userLocation, dropOffLocations);
        setSortedRoute(sortedLocations);

        for (let i = 0; i < sortedLocations.length; i++) {
            const destination = sortedLocations[i];
            try {
                await navigateToDestination(destination);
            } catch (error) {
                console.error(`Error navigating to location ${i + 1}:`, error);
            }
        }
    };

    const navigateToDestination = async (destination) => {
        return new Promise((resolve, reject) => {
            directionsServiceRef.current.route(
                {
                    origin: userLocation,
                    destination: destination,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current.setDirections(result);
                        setDirections(result.routes[0].legs[0]);
                        resolve();
                    } else {
                        reject(new Error(`Failed to get directions: ${status}`));
                    }
                }
            );
        });
    };

    const startLocationTracking = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);
        watchPositionId.current = navigator.geolocation.watchPosition(
            (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(location);
            },
            (error) => {
                setError(`Error getting location: ${error.message}`);
                setIsTracking(false);
            }
        );
    };

    return (
        <div>
            <h1><MapPin /> School Bus Tracker</h1>
            <button onClick={startTrip}>Start Trip</button>
            <div ref={mapRef} style={{ width: '100%', height: '500px' }} />
            {directions && <p>Next Stop: {directions.end_address}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default LocationTracker;
