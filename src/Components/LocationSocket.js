import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_SERVER);
const mapContainerStyle = { width: "100vw", height: "100vh" };
const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco

function App() {
    const { isLoaded } = useLoadScript({ googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY });
    const [users, setUsers] = useState([]); // Store locations of all connected users
    const [userLocation, setUserLocation] = useState(null); // Store own location

    // Listen for location updates
    useEffect(() => {
        socket.on("updateLocations", (updatedUsers) => {
            setUsers(updatedUsers);
        });

        return () => socket.off("updateLocations");
    }, []);

    // Send location updates when user moves
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition((position) => {
                const userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(userLoc);
                socket.emit("sendLocation", userLoc);
            });

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    return (
        <div>
            {isLoaded && (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation || defaultCenter} zoom={14}>
                    {users.map((user) => (
                        <Marker
                            key={user.id}
                            position={{ lat: user.lat, lng: user.lng }}
                            icon={{
                                url: user.id === socket.id
                                    ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // Own marker (blue)
                                    : "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Other users (red)
                                scaledSize: new window.google.maps.Size(40, 40),
                            }}
                        />
                    ))}
                </GoogleMap>
            )}
        </div>
    );
}

export default App;
