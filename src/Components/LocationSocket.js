import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_SERVER);
const mapContainerStyle = { width: "100vw", height: "100vh" };
const defaultCenter = { lat: 37.7749, lng: -122.4194 };

function App() {
  

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    });
    const [users, setUsers] = useState(new Map()); // Using Map to store user locations
    const [userLocation, setUserLocation] = useState(null);
    const [map, setMap] = useState(null);

    // Handle individual location updates
    const handleLocationUpdate = useCallback((location) => {
        setUsers(prevUsers => {
            const newUsers = new Map(prevUsers);
            newUsers.set(location.userId, location);
            return newUsers;
        });
    }, []);

    // Handle bulk location updates
    const handleLocationsUpdate = useCallback((locations) => {
        const locationsMap = new Map();
        locations.forEach(location => {
            locationsMap.set(location.userId, location);
        });
        setUsers(locationsMap);
    }, []);

    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (userId) {
            socket.emit('authenticate', userId);
        }

        // Listen for individual location updates
        socket.on("locationUpdate", handleLocationUpdate);

        // Listen for bulk location updates
        socket.on("updateLocations", handleLocationsUpdate);

        return () => {
            socket.off("locationUpdate");
            socket.off("updateLocations");
        };
    }, [handleLocationUpdate, handleLocationsUpdate]);

    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const userLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(userLoc);
                    socket.emit("sendLocation", userLoc);
                },
                (error) => console.error("Error getting location:", error),
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Auto-center map on user's location
    useEffect(() => {
        if (map && userLocation) {
            map.panTo(userLocation);
        }
    }, [map, userLocation]);

    const onMapLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const userId = localStorage.getItem('userId');

    return (
        <div>

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