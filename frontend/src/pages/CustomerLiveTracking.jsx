import { lazy, Suspense, useEffect, useState } from "react";
import { getDeliveryLocation } from "../services/deliveryTrackingApi";

const DeliveryTrackingMap = lazy(() => import("./DeliveryTrackingMap"));

const STALE_AFTER_MS = 60_000;

function locationState(tracking, requestError, now) {
    if (requestError) return { label: "Offline", className: "offline" };
    if (!tracking) return { label: "Connecting", className: "connecting" };
    if (!tracking.last_location_at) {
        return tracking.is_sharing
            ? { label: "Waiting for GPS", className: "connecting" }
            : { label: "Not sharing", className: "offline" };
    }
    const age = now - new Date(tracking.last_location_at).getTime();
    if (age > STALE_AFTER_MS) return { label: "Stale location", className: "stale" };
    if (!tracking.is_sharing) return { label: "Sharing stopped", className: "offline" };
    return { label: "Live", className: "live" };
}

function CustomerLiveTracking({ orderId }) {
    const [tracking, setTracking] = useState(null);
    const [requestError, setRequestError] = useState("");
    const [loading, setLoading] = useState(true);
    const [clock, setClock] = useState(Date.now());
    const [deliveryStatus, setDeliveryStatus] = useState("Shipped");

    useEffect(() => {
        let mounted = true;
        let deliveryEnded = false;
        let requestInFlight = false;
        const load = async () => {
            if (deliveryEnded || requestInFlight) return;
            requestInFlight = true;
            try {
                const result = await getDeliveryLocation(orderId);
                if (mounted) {
                    setTracking(result.tracking);
                    setDeliveryStatus(result.status);
                    setRequestError("");
                }
                if (result.status === "Delivered" || result.status === "Cancelled") {
                    deliveryEnded = true;
                }
            } catch (error) {
                if (mounted) setRequestError(error.message);
            } finally {
                requestInFlight = false;
                if (mounted) setLoading(false);
            }
        };

        load();
        const pollId = window.setInterval(load, 5000);
        const clockId = window.setInterval(() => setClock(Date.now()), 5000);
        return () => {
            mounted = false;
            window.clearInterval(pollId);
            window.clearInterval(clockId);
        };
    }, [orderId]);

    const state = locationState(tracking, requestError, clock);
    const hasLocation = tracking?.latitude !== null
        && tracking?.latitude !== undefined
        && tracking?.longitude !== null
        && tracking?.longitude !== undefined;
    const lastUpdated = tracking?.last_location_at
        ? new Date(tracking.last_location_at).toLocaleString()
        : "No location update yet";

    return (
        <section className="customer-live-tracking" aria-labelledby="customer-live-tracking-title">
            <div className="tracking-section-heading">
                <div>
                    <h2 id="customer-live-tracking-title">Live delivery tracking</h2>
                    <p>Order #{orderId} · {deliveryStatus}</p>
                </div>
                <span className={`tracking-status ${state.className}`}>{state.label}</span>
            </div>

            {requestError && (
                <p className="tracking-error" role="alert">{requestError}. Retrying automatically.</p>
            )}
            {loading && <p className="tracking-guidance" role="status">Connecting to delivery updates...</p>}
            {!loading && !hasLocation && !requestError && (
                <p className="tracking-guidance">
                    {deliveryStatus !== "Shipped"
                        ? "Delivery tracking has ended for this order."
                        : tracking?.assigned
                        ? "Your delivery person has not shared a GPS location yet. Updates appear here automatically."
                        : "A delivery person has not been assigned for tracking yet."}
                </p>
            )}
            {hasLocation && (
                <>
                    <p className="tracking-guidance">
                        Last location update: {lastUpdated}. The map shows the most recent GPS position, not a route or arrival-time estimate.
                    </p>
                    <Suspense fallback={<p className="tracking-guidance">Loading map...</p>}>
                        <DeliveryTrackingMap locations={[{
                            order_id: orderId,
                            latitude: tracking.latitude,
                            longitude: tracking.longitude,
                            last_location_at: tracking.last_location_at,
                        }]} />
                    </Suspense>
                    <p className="tracking-guidance">
                        Approximate coordinates: {Number(tracking.latitude).toFixed(5)}, {Number(tracking.longitude).toFixed(5)}
                        {tracking.accuracy_meters != null && ` · GPS accuracy about ${Math.round(tracking.accuracy_meters)} m`}
                    </p>
                </>
            )}
            <p className="tracking-guidance">
                Keep your phone available for delivery confirmation. Live location does not replace the existing delivery OTP process.
            </p>
        </section>
    );
}

export default CustomerLiveTracking;