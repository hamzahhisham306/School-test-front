import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_SERVER);
const mapContainerStyle = { width: "100vw", height: "100vh" };
const defaultCenter = { lat: 37.7749, lng: -122.4194 };

function App() {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    });

    const [users, setUsers] = useState(new Map());
    const [userLocation, setUserLocation] = useState(null);
    const [map, setMap] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [locationPermission, setLocationPermission] = useState(true);
    const [error, setError] = useState(null);

    // Error handling
    const handleError = (error) => {
        setError(error.message);
        setTimeout(() => setError(null), 5000);
    };

    // Location update handlers
    const handleLocationUpdate = useCallback((location) => {
        setUsers(prevUsers => {
            const newUsers = new Map(prevUsers);
            newUsers.set(location.userId, location);
            return newUsers;
        });
    }, []);

    const handleLocationsUpdate = useCallback((locations) => {
        const locationsMap = new Map();
        locations.forEach(location => {
            locationsMap.set(location.userId, location);
        });
        setUsers(locationsMap);
    }, []);

    // Socket connection management
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        
        socket.on('connect', () => {
            setConnectionStatus('connected');
            if (userId) {
                socket.emit('authenticate', userId);
            }
        });

        socket.on('disconnect', () => {
            setConnectionStatus('disconnected');
        });

        socket.on('error', (error) => {
            handleError({ message: error });
        });

        socket.on('connect_error', (error) => {
            handleError(error);
            setConnectionStatus('error');
        });

        socket.on('permissionsUpdated', (permissions) => {
            setLocationPermission(permissions.locationSharing);
        });

        socket.on("locationUpdate", handleLocationUpdate);
        socket.on("updateLocations", handleLocationsUpdate);

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('error');
            socket.off('connect_error');
            socket.off('permissionsUpdated');
            socket.off("locationUpdate");
            socket.off("updateLocations");
        };
    }, [handleLocationUpdate, handleLocationsUpdate]);

    // Location tracking
    useEffect(() => {
        if (!locationPermission) return;

        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const userLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(userLoc);
                    if (connectionStatus === 'connected') {
                        socket.emit("sendLocation", userLoc);
                    }
                },
                (error) => handleError(error),
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [connectionStatus, locationPermission]);

    // Map auto-centering
    useEffect(() => {
        if (map && userLocation) {
            map.panTo(userLocation);
        }
    }, [map, userLocation]);

    const onMapLoad = useCallback((map) => {
        setMap(map);
    }, []);

    // Permission toggle component
    const PermissionToggle = () => (
        <div className="permission-toggle">
            <label>
                Share Location:
                <input
                    type="checkbox"
                    checked={locationPermission}
                    onChange={(e) => {
                        setLocationPermission(e.target.checked);
                        socket.emit('updatePermissions', { locationSharing: e.target.checked });
                    }}
                />
            </label>
        </div>
    );

    const userId = localStorage.getItem('userId');

    return (
        <div>
            {error && <div className="error-message">{error}</div>}
            <div className="connection-status">Status: {connectionStatus}</div>
            <PermissionToggle />
            
            {isLoaded && (
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={userLocation || defaultCenter}
                    zoom={14}
                    onLoad={onMapLoad}
                    options={{
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                    }}
                >
                    {Array.from(users.values()).map((user) => (
                        <Marker
                            key={user.userId}
                            position={{ lat: user.lat, lng: user.lng }}
                            icon={{
                                url: user.userId === userId
                                    ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                                    : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                scaledSize: new window.google.maps.Size(40, 40),
                            }}
                            title={user.userName}
                        />
                    ))}
                </GoogleMap>
            )}
        </div>
    );
}

export default App;