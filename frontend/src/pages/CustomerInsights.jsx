import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerInsights } from "../services/customerInsightsApi";
import "../styles/CustomerInsights.css";

const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const formatDate = (value) =>
    new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));

function SpendingTrend({ points }) {
    const width = 680;
    const height = 220;
    const padding = { top: 18, right: 16, bottom: 38, left: 16 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = points.map((point) => Number(point.amount));
    const max = Math.max(...values, 1);
    const coordinates = points.map((point, index) => ({
        ...point,
        x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
        y: padding.top + chartHeight - (Number(point.amount) / max) * chartHeight,
    }));
    const path = coordinates.map(({ x, y }, index) =>
        `${index === 0 ? "M" : "L"}${x},${y}`
    ).join(" ");

    return (
        <div className="ci-chart-scroll">
            <svg
                className="ci-chart"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Your successful payment totals over the last six months"
            >
                {[0, 0.5, 1].map((fraction) => {
                    const y = padding.top + chartHeight * fraction;
                    return <line className="ci-grid-line" key={fraction} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />;
                })}
                <path className="ci-trend-line" d={path} />
                {coordinates.map((point) => (
                    <g key={point.month}>
                        <circle className="ci-point" cx={point.x} cy={point.y} r="4">
                            <title>{`${point.label}: ${formatMoney(point.amount)}`}</title>
                        </circle>
                        <text className="ci-axis-label" x={point.x} y={height - 12} textAnchor="middle">
                            {point.label.split(" ")[0]}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function CustomerInsights() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const loadInsights = async (signal) => {
        setLoading(true);
        setError("");
        try {
            setData(await getCustomerInsights(signal));
        } catch (loadError) {
            if (loadError.name !== "AbortError") {
                setError(loadError.message);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        loadInsights(controller.signal);
        return () => controller.abort();
    }, []);

    return (
        <main className="customer-insights">
            <header className="ci-header">
                <div>
                    <p className="ci-eyebrow">YOUR ACCOUNT</p>
                    <h1>My Shopping Insights</h1>
                    <p className="ci-subtitle">A personal view of your orders and shopping activity.</p>
                </div>
                <button className="ci-refresh" type="button" onClick={() => loadInsights()} disabled={loading}>
                    {loading ? "Updating..." : "Refresh"}
                </button>
            </header>

            {error && (
                <div className="ci-error" role="alert">
                    <span>{error}</span>
                    {!localStorage.getItem("access_token") && <Link to="/login">Sign in</Link>}
                    <button type="button" onClick={() => loadInsights()} disabled={loading}>Retry</button>
                </div>
            )}

            {loading && !data ? (
                <div className="ci-state" role="status">Loading your insights...</div>
            ) : data ? (
                <>
                    <section className="ci-kpis" aria-label="Your shopping summary">
                        <article className="ci-kpi ci-spend">
                            <span>Successful spend</span>
                            <strong>{formatMoney(data.summary.successful_spend)}</strong>
                            <small>Verified successful payments only</small>
                        </article>
                        <article className="ci-kpi ci-orders">
                            <span>Total orders</span>
                            <strong>{data.summary.orders}</strong>
                            <small>{data.summary.delivered_orders} delivered</small>
                        </article>
                        <article className="ci-kpi ci-cart">
                            <span>Cart</span>
                            <strong>{data.summary.cart_products}</strong>
                            <small>{data.summary.cart_units} total units</small>
                        </article>
                        <article className="ci-kpi ci-wishlist">
                            <span>Wishlist</span>
                            <strong>{data.summary.wishlist_products}</strong>
                            <small>Saved products</small>
                        </article>
                    </section>

                    <section className="ci-panel ci-spending-panel">
                        <div className="ci-panel-heading">
                            <div>
                                <p className="ci-eyebrow">PAYMENTS</p>
                                <h2>Spending over time</h2>
                            </div>
                            <span>Last 6 months</span>
                        </div>
                        <p className="ci-note">Based on payments marked successful. Pending payments are excluded.</p>
                        <SpendingTrend points={data.spending_trend} />
                    </section>

                    <section className="ci-panel ci-orders-panel">
                        <div className="ci-panel-heading">
                            <div>
                                <p className="ci-eyebrow">ORDER HISTORY</p>
                                <h2>Recent orders</h2>
                            </div>
                            <Link to="/orders">All orders</Link>
                        </div>
                        {data.recent_orders.length ? (
                            <div className="ci-table-wrap">
                                <table>
                                    <thead>
                                        <tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th><span className="ci-sr-only">Details</span></th></tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_orders.map((order) => (
                                            <tr key={order.id}>
                                                <td>#{order.id}</td>
                                                <td>{formatDate(order.created_at)}</td>
                                                <td><span className={`ci-status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                                                <td>{formatMoney(order.total)}</td>
                                                <td><Link to={`/orders/${order.id}`}>View</Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="ci-empty">No orders yet. Your order activity will appear here.</p>
                        )}
                    </section>
                </>
            ) : null}
        </main>
    );
}

export default CustomerInsights;