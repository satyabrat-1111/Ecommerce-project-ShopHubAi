import { lazy, Suspense, useEffect, useState } from "react";
import {
    assignDeliveryPerson,
    getAdminDeliveries,
    getDeliveryAssignees,
} from "../services/deliveryTrackingApi";
import "../styles/DeliveryTracking.css";

const DeliveryTrackingMap = lazy(() => import("./DeliveryTrackingMap"));

const freshnessLabel = (timestamp, sharing) => {
    if (!timestamp) return sharing ? "Waiting for GPS" : "No location";
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > 60_000) return "Stale";
    return sharing ? "Live" : "Sharing stopped";
};

function AdminDeliveryTracking() {
    const [deliveries, setDeliveries] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [selectedPeople, setSelectedPeople] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingOrderId, setSavingOrderId] = useState(null);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);

    useEffect(() => {
        let mounted = true;
        const refresh = async () => {
            try {
                const [active, people] = await Promise.all([
                    getAdminDeliveries(),
                    getDeliveryAssignees(),
                ]);
                if (!mounted) return;
                setDeliveries(active);
                setAssignees(people);
                setSelectedPeople((previous) => {
                    const selections = { ...previous };
                    active.forEach((delivery) => {
                        if (!(delivery.order_id in selections)) {
                            selections[delivery.order_id] = delivery.delivery_person_id || "";
                        }
                    });
                    return selections;
                });
                setUpdatedAt(new Date());
                setError("");
            } catch (loadError) {
                if (mounted) setError(loadError.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        refresh();
        const pollId = window.setInterval(refresh, 10000);
        return () => {
            mounted = false;
            window.clearInterval(pollId);
        };
    }, []);

    const saveAssignment = async (orderId) => {
        try {
            setSavingOrderId(orderId);
            setError("");
            await assignDeliveryPerson(orderId, selectedPeople[orderId]);
            const active = await getAdminDeliveries();
            setDeliveries(active);
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSavingOrderId(null);
        }
    };

    const locations = deliveries
        .filter((delivery) => delivery.tracking.latitude !== null && delivery.tracking.longitude !== null)
        .map((delivery) => ({
            order_id: delivery.order_id,
            ...delivery.tracking,
        }));

    return (
        <main className="admin-delivery-page">
            <header className="tracking-page-header">
                <div>
                    <p className="ci-eyebrow">OPERATIONS</p>
                    <h1>Delivery tracking</h1>
                    <p>Monitor shipped orders and manage delivery assignments.</p>
                </div>
                <span className="tracking-status live">Auto-refresh · 10 sec</span>
            </header>

            {error && <p className="tracking-error" role="alert">{error}</p>}
            {updatedAt && <p className="tracking-message">Last refreshed {updatedAt.toLocaleTimeString()}</p>}

            {loading ? (
                <p className="tracking-message" role="status">Loading active deliveries...</p>
            ) : deliveries.length === 0 ? (
                <p className="tracking-empty">There are no shipped orders to track right now.</p>
            ) : (
                <>
                    <div className="admin-delivery-table-wrap">
                        <table className="admin-delivery-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Status</th>
                                    <th>Assigned delivery account</th>
                                    <th>Location freshness</th>
                                    <th>Last update</th>
                                    <th>Assignment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveries.map((delivery) => (
                                    <tr key={delivery.order_id}>
                                        <td>#{delivery.order_id}</td>
                                        <td>{delivery.status}</td>
                                        <td>{delivery.delivery_person || "Unassigned"}</td>
                                        <td>{freshnessLabel(delivery.tracking.last_location_at, delivery.tracking.is_sharing)}</td>
                                        <td>{delivery.tracking.last_location_at
                                            ? new Date(delivery.tracking.last_location_at).toLocaleString()
                                            : "Not shared"}</td>
                                        <td>
                                            <div className="tracking-toolbar">
                                                <select
                                                    aria-label={`Delivery account for order ${delivery.order_id}`}
                                                    value={selectedPeople[delivery.order_id] ?? ""}
                                                    onChange={(event) => setSelectedPeople((previous) => ({
                                                        ...previous,
                                                        [delivery.order_id]: event.target.value,
                                                    }))}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {assignees.map((person) => (
                                                        <option key={person.id} value={person.id}>{person.username}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="tracking-action"
                                                    type="button"
                                                    disabled={savingOrderId === delivery.order_id}
                                                    onClick={() => saveAssignment(delivery.order_id)}
                                                >
                                                    {savingOrderId === delivery.order_id ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <section className="admin-delivery-map" aria-label="Delivery location map">
                        <h2>Latest shared locations</h2>
                        {locations.length ? (
                            <Suspense fallback={<p className="tracking-message">Loading map...</p>}>
                                <DeliveryTrackingMap locations={locations} />
                            </Suspense>
                        ) : (
                            <p className="tracking-empty">No active order has submitted GPS coordinates yet.</p>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

export default AdminDeliveryTracking;