import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/DeliveryTracking.css";

const markerIcon = L.divIcon({
    className: "delivery-map-marker-wrap",
    html: '<span class="delivery-map-marker"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

const validLocations = (locations) => locations.filter((location) =>
    Number.isFinite(Number(location.latitude))
    && Number.isFinite(Number(location.longitude))
    && location.latitude !== null
    && location.longitude !== null
);

function FitLocations({ locations }) {
    const map = useMap();
    const locationsRef = useRef(locations);
    locationsRef.current = locations;
    const locationKey = locations.map((location) =>
        `${location.order_id || "single"}`
    ).join("|");

    useEffect(() => {
        const points = validLocations(locationsRef.current).map((location) => [
            Number(location.latitude),
            Number(location.longitude),
        ]);
        if (points.length === 1) {
            map.setView(points[0], 15);
        } else if (points.length > 1) {
            map.fitBounds(points, { padding: [28, 28], maxZoom: 14 });
        }
    }, [locationKey, map]);

    return null;
}

function DeliveryTrackingMap({ locations, className = "" }) {
    const [tileError, setTileError] = useState(false);
    const points = validLocations(locations);
    if (!points.length) {
        return <div className={`delivery-map-empty ${className}`}>A GPS location has not been shared yet.</div>;
    }

    const center = [Number(points[0].latitude), Number(points[0].longitude)];
    return (
        <div className={`delivery-map ${className}`}>
            <MapContainer center={center} zoom={14} scrollWheelZoom className="delivery-map-canvas">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{ tileerror: () => setTileError(true) }}
                />
                <FitLocations locations={points} />
                {points.map((point) => (
                    <Marker
                        key={point.order_id || "delivery"}
                        position={[Number(point.latitude), Number(point.longitude)]}
                        icon={markerIcon}
                    >
                        <Popup>
                            {point.order_id ? `Order #${point.order_id}` : "Delivery location"}
                            {point.last_location_at && <><br />Updated {new Date(point.last_location_at).toLocaleString()}</>}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            {tileError && <p className="delivery-map-attribution-note" role="status">Map tiles are temporarily unavailable. The latest coordinates and update time remain available.</p>}
            <p className="delivery-map-attribution-note">Map tiles by OpenStreetMap contributors. Tile availability follows the public tile usage policy.</p>
        </div>
    );
}

export default DeliveryTrackingMap;