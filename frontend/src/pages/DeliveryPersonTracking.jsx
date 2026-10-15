import { useEffect, useRef, useState } from "react";
import {
    getAssignedDeliveries,
    startDeliverySharing,
    stopDeliverySharing,
    submitDeliveryLocation,
} from "../services/deliveryTrackingApi";
import "../styles/DeliveryTracking.css";

const LOCAL_SEND_INTERVAL_MS = 3500;

function geoErrorMessage(error) {
    if (error.code === 1) return "Location permission was denied. Allow location access and start sharing again.";
    if (error.code === 2) return "The browser could not determine your location. Check GPS and network availability.";
    if (error.code === 3) return "GPS timed out. Keep this page open and try starting location sharing again.";
    return "Unable to read the current location.";
}

function DeliveryPersonTracking() {
    const [deliveries, setDeliveries] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [sharingOrderId, setSharingOrderId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [gpsMessage, setGpsMessage] = useState("Location is not being accessed.");
    const [connection, setConnection] = useState("Offline");
    const [lastUpdated, setLastUpdated] = useState(null);
    const watchIdRef = useRef(null);
    const sharingOrderRef = useRef(null);
    const lastSentAtRef = useRef(0);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const rows = await getAssignedDeliveries();
                if (mounted) {
                    setDeliveries(rows);
                    setSelectedOrderId((previous) =>
                        rows.some((row) => String(row.order_id) === previous)
                            ? previous
                            : rows[0] ? String(rows[0].order_id) : ""
                    );
                    if (
                        sharingOrderRef.current
                        && !rows.some((row) => String(row.order_id) === sharingOrderRef.current)
                    ) {
                        sharingOrderRef.current = null;
                        if (watchIdRef.current !== null && navigator.geolocation) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                            watchIdRef.current = null;
                        }
                        setSharingOrderId(null);
                        setConnection("Offline");
                        setGpsMessage("This order is no longer active. Location sharing has stopped.");
                    }
                    setError("");
                }
            } catch (loadError) {
                if (mounted) setError(loadError.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        const pollId = window.setInterval(load, 5000);
        return () => {
            mounted = false;
            window.clearInterval(pollId);
        };
    }, []);

    useEffect(() => {
        if (!sharingOrderId) return undefined;
        if (!navigator.geolocation) {
            setError("This browser does not provide GPS location sharing.");
            setConnection("Error");
            return undefined;
        }

        setGpsMessage("Waiting for a GPS fix...");
        setConnection("Connecting");
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const now = Date.now();
                if (now - lastSentAtRef.current < LOCAL_SEND_INTERVAL_MS) return;
                lastSentAtRef.current = now;
                setGpsMessage("Location permission granted. Sending current position.");
                try {
                    const result = await submitDeliveryLocation(sharingOrderId, position.coords);
                    setLastUpdated(result.last_location_at);
                    setConnection("Live");
                    setError("");
                } catch (sendError) {
                    if (sendError.message.includes("Start sharing for an active shipped order first")) {
                        sharingOrderRef.current = null;
                        if (watchIdRef.current !== null && navigator.geolocation) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                            watchIdRef.current = null;
                        }
                        setSharingOrderId(null);
                        setGpsMessage("This order is no longer active. Location sharing has stopped.");
                        setConnection("Offline");
                        return;
                    }
                    setConnection("Offline");
                    setError(sendError.message);
                }
            },
            async (geoError) => {
                setGpsMessage(geoErrorMessage(geoError));
                setConnection(geoError.code === 1 ? "Permission denied" : "GPS unavailable");
                const activeOrderId = sharingOrderRef.current;
                sharingOrderRef.current = null;
                setSharingOrderId(null);
                if (activeOrderId) {
                    try {
                        await stopDeliverySharing(activeOrderId);
                    } catch {
                        setError("GPS stopped locally, but the server could not be notified. The last position will become stale.");
                    }
                }
            },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
        );
        watchIdRef.current = watchId;
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [sharingOrderId]);

    useEffect(() => () => {
        const activeOrderId = sharingOrderRef.current;
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        if (activeOrderId) {
            stopDeliverySharing(activeOrderId, true).catch(() => {});
        }
    }, []);

    const startSharing = async () => {
        if (!window.isSecureContext) {
            setError("Browser location requires HTTPS outside localhost.");
            return;
        }
        if (!navigator.geolocation) {
            setError("This browser does not provide GPS location sharing.");
            return;
        }
        if (!selectedOrderId) return;

        try {
            setError("");
            setGpsMessage("Requesting browser location permission...");
            await startDeliverySharing(selectedOrderId);
            sharingOrderRef.current = selectedOrderId;
            lastSentAtRef.current = 0;
            setLastUpdated(null);
            setSharingOrderId(selectedOrderId);
        } catch (startError) {
            setError(startError.message);
        }
    };

    const stopSharing = async () => {
        const activeOrderId = sharingOrderRef.current;
        sharingOrderRef.current = null;
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setSharingOrderId(null);
        setConnection("Offline");
        setGpsMessage("Location sharing stopped.");
        if (activeOrderId) {
            try {
                await stopDeliverySharing(activeOrderId);
            } catch (stopError) {
                setError(stopError.message);
            }
        }
    };

    const selectedDelivery = deliveries.find(
        (row) => String(row.order_id) === selectedOrderId
    );

    return (
        <main className="delivery-tracking-page">
            <header className="tracking-page-header">
                <div>
                    <p className="ci-eyebrow">ASSIGNED DELIVERIES</p>
                    <h1>Share Delivery Location</h1>
                    <p>Location is requested only when you start sharing. Keep this page open during the delivery.</p>
                </div>
                <span className={`tracking-status ${connection === "Live" ? "live" : connection === "Offline" ? "offline" : "connecting"}`}>
                    {connection}
                </span>
            </header>

            {error && <p className="tracking-error" role="alert">{error}</p>}
            {loading ? (
                <p className="tracking-message" role="status">Loading your assignments...</p>
            ) : deliveries.length === 0 ? (
                <p className="tracking-empty">No shipped orders are currently assigned to this account.</p>
            ) : (
                <>
                    <div className="tracking-toolbar">
                        <label className="tracking-field" htmlFor="delivery-order-select">
                            Order
                            <select
                                id="delivery-order-select"
                                value={selectedOrderId}
                                onChange={(event) => setSelectedOrderId(event.target.value)}
                                disabled={Boolean(sharingOrderId)}
                            >
                                {deliveries.map((delivery) => (
                                    <option key={delivery.order_id} value={delivery.order_id}>
                                        Order #{delivery.order_id} · {delivery.status}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {sharingOrderId ? (
                            <button className="tracking-action secondary" type="button" onClick={stopSharing}>Stop location sharing</button>
                        ) : (
                            <button className="tracking-action" type="button" onClick={startSharing} disabled={!selectedOrderId}>
                                Start / resume location sharing
                            </button>
                        )}
                    </div>

                    <section className="tracking-delivery-card" aria-label="Location sharing status">
                        <div className="tracking-section-heading">
                            <div>
                                <h2>Order #{selectedDelivery?.order_id}</h2>
                                <p>Status: {selectedDelivery?.status}</p>
                            </div>
                            <span className={`tracking-status ${connection === "Live" ? "live" : connection === "Offline" ? "offline" : "connecting"}`}>
                                {sharingOrderId ? "Sharing in this browser" : selectedDelivery?.is_sharing ? "Server sharing active" : "Not sharing"}
                            </span>
                        </div>
                        <p className="tracking-message" role="status">{gpsMessage}</p>
                        {(lastUpdated || selectedDelivery?.last_location_at) && <p className="tracking-message">Last successful update: {new Date(lastUpdated || selectedDelivery.last_location_at).toLocaleString()}</p>}
                        {selectedDelivery?.is_sharing && !sharingOrderId && (
                            <p className="tracking-message">This page is not currently sending GPS. Press Start / resume to explicitly grant location access in this browser.</p>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

export default DeliveryPersonTracking;