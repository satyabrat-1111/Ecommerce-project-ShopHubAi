import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/BusinessAnalytics.css";
import { getBusinessAnalytics } from "../services/analyticsApi";

const today = () => {
    const current = new Date();
    return [
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, "0"),
        String(current.getDate()).padStart(2, "0"),
    ].join("-");
};

const daysAgo = (days) => {
    const current = new Date();
    current.setDate(current.getDate() - days);
    return [
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, "0"),
        String(current.getDate()).padStart(2, "0"),
    ].join("-");
};

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
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

const csvValue = (value) => {
    const text = String(value ?? "");
    const safeText = /^\s*[-=+@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
};

function downloadReport(data) {
    const rows = [
        ["ShopHubAI Business Intelligence"],
        [`Period: ${data.period.start} to ${data.period.end}`],
        [],
        ["Metric", "Value"],
        ...Object.entries(data.kpis),
        [],
        ["Order status", "Orders"],
        ...data.order_statuses.map(({ status, count }) => [status, count]),
        [],
        ["Payment status", "Payments"],
        ...data.payment_statuses.map(({ payment_status, count }) => [payment_status, count]),
        [],
        ["Top products", "SKU", "Units sold", "Revenue"],
        ...data.top_products.map((product) => [
            product.name,
            product.sku,
            product.quantity,
            product.revenue,
        ]),
        [],
        ["Category", "Units sold", "Revenue"],
        ...data.category_sales.map((category) => [
            category.name,
            category.quantity,
            category.revenue,
        ]),
        [],
        ["Customer registrations", "New customers"],
        ...data.customer_trend.map((point) => [point.date, point.new_customers]),
        [],
        ["Inventory item", "SKU", "Category", "Stock"],
        ...data.inventory.map((product) => [
            product.name,
            product.sku,
            product.category__name,
            product.stock,
        ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shophub-business-report-${data.period.start}-${data.period.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function SalesTrend({ points }) {
    if (!points?.length) {
        return <p className="ba-empty">No sales data for this period.</p>;
    }

    const chartWidth = 720;
    const chartHeight = 250;
    const left = 66;
    const right = 20;
    const top = 18;
    const bottom = 42;
    const max = Math.max(...points.map((point) => Number(point.sales)), 1);
    const usableWidth = chartWidth - left - right;
    const usableHeight = chartHeight - top - bottom;
    const coordinates = points.map((point, index) => ({
        ...point,
        x: left + (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth),
        y: top + usableHeight - (Number(point.sales) / max) * usableHeight,
    }));
    const path = coordinates.map(({ x, y }, index) =>
        `${index === 0 ? "M" : "L"}${x},${y}`
    ).join(" ");
    const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

    return (
        <div className="ba-chart-scroll">
            <svg
                className="ba-trend-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Successful sales trend for the selected period"
            >
                {[0, 0.5, 1].map((fraction) => {
                    const y = top + usableHeight * fraction;
                    return (
                        <g key={fraction}>
                            <line className="ba-grid-line" x1={left} x2={chartWidth - right} y1={y} y2={y} />
                            <text className="ba-axis-label" x={left - 10} y={y + 4} textAnchor="end">
                                {formatMoney(max * (1 - fraction))}
                            </text>
                        </g>
                    );
                })}
                <path className="ba-trend-line" d={path} />
                {coordinates.map((point) => (
                    <circle className="ba-trend-point" key={point.date} cx={point.x} cy={point.y} r="3.5">
                        <title>{`${formatDate(point.date)}: ${formatMoney(point.sales)} sales, ${point.orders} orders`}</title>
                    </circle>
                ))}
                {labelIndexes.map((index) => (
                    <text
                        className="ba-axis-label"
                        key={points[index].date}
                        x={coordinates[index].x}
                        y={chartHeight - 12}
                        textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                    >
                        {formatDate(points[index].date)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function Breakdown({ rows, labelKey, color = "green", money = false }) {
    if (!rows?.length) {
        return <p className="ba-empty">No records for this period.</p>;
    }

    const max = Math.max(...rows.map((row) => Number(row.count ?? row.revenue)), 1);
    return (
        <div className="ba-breakdown">
            {rows.map((row) => {
                const value = Number(row.count ?? row.revenue);
                return (
                    <div className="ba-breakdown-row" key={row[labelKey]}>
                        <div className="ba-breakdown-copy">
                            <span>{row[labelKey]}</span>
                            <strong>{money ? formatMoney(value) : value}</strong>
                        </div>
                        <div className="ba-bar-track" aria-hidden="true">
                            <span className={`ba-bar-fill ${color}`} style={{ width: `${Math.max(value / max * 100, value ? 4 : 0)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function CustomerTrend({ points }) {
    if (!points?.length) {
        return <p className="ba-empty">No new registrations for this period.</p>;
    }

    const width = 320;
    const height = 92;
    const left = 25;
    const right = 8;
    const top = 7;
    const bottom = 20;
    const max = Math.max(...points.map((point) => point.new_customers), 1);
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const slot = chartWidth / points.length;
    const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

    return (
        <div className="ba-customer-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="New customer registrations in the selected period">
                {[0, 1].map((fraction) => {
                    const y = top + chartHeight * fraction;
                    return (
                        <g key={fraction}>
                            <line className="ba-customer-grid" x1={left} x2={width - right} y1={y} y2={y} />
                            <text className="ba-customer-axis" x={left - 4} y={y + 3} textAnchor="end">
                                {Math.round(max * (1 - fraction))}
                            </text>
                        </g>
                    );
                })}
                {points.map((point, index) => {
                    const barHeight = (point.new_customers / max) * chartHeight;
                    return (
                        <rect
                            className="ba-customer-bar"
                            key={point.date}
                            x={left + index * slot + Math.max(slot * 0.2, 0.5)}
                            y={top + chartHeight - barHeight}
                            width={Math.max(slot * 0.6, 1)}
                            height={Math.max(barHeight, 1)}
                            rx="1"
                        >
                            <title>{`${formatDate(point.date)}: ${point.new_customers} new customers`}</title>
                        </rect>
                    );
                })}
                {labelIndexes.map((index) => (
                    <text
                        className="ba-customer-axis"
                        key={points[index].date}
                        x={left + index * slot + slot / 2}
                        y={height - 4}
                        textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                    >
                        {formatDate(points[index].date).replace(/\s\d{4}$/, "")}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function BusinessAnalytics() {
    const [reportRange, setReportRange] = useState({ start: daysAgo(29), end: today() });
    const [customStart, setCustomStart] = useState(daysAgo(29));
    const [customEnd, setCustomEnd] = useState(today());
    const [rangeChoice, setRangeChoice] = useState("30");
    const [granularity, setGranularity] = useState("daily");
    const [theme, setTheme] = useState(() => localStorage.getItem("analytics_theme") || "system");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        localStorage.setItem("analytics_theme", theme);
    }, [theme]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        getBusinessAnalytics({
            ...reportRange,
            granularity,
        }, controller.signal)
            .then(setData)
            .catch((requestError) => {
                if (requestError.name !== "AbortError") {
                    setError(requestError.message || "Unable to load the analytics report.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [reportRange, granularity, refreshKey]);

    const selectPreset = (days) => {
        const end = today();
        const start = daysAgo(Number(days) - 1);
        setRangeChoice(days);
        setCustomStart(start);
        setCustomEnd(end);
        setReportRange({ start, end });
    };

    const applyCustomRange = () => {
        if (!customStart || !customEnd || customStart > customEnd) {
            setError("Choose a valid start and end date.");
            return;
        }
        const length = (new Date(`${customEnd}T00:00:00Z`) - new Date(`${customStart}T00:00:00Z`)) / 86400000;
        if (length > 365) {
            setError("Custom ranges can include up to 366 days.");
            return;
        }
        setRangeChoice("custom");
        setReportRange({ start: customStart, end: customEnd });
    };

    const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const kpis = data?.kpis;
    const cards = kpis ? [
        { label: "Successful sales", value: formatMoney(kpis.successful_sales), detail: "Sum of payments verified as Success", target: "sales-report", tone: "green" },
        { label: "Orders", value: kpis.orders, detail: "Orders created during this period", target: "order-report", tone: "blue" },
        { label: "Average order value", value: formatMoney(kpis.average_order_value), detail: "Successful sales divided by successful payments", target: "sales-report", tone: "amber" },
        { label: "Delivered", value: kpis.delivered_orders, detail: "Orders marked Delivered during this period", target: "order-report", tone: "blue" },
        { label: "New customers", value: kpis.new_customers, detail: "Non-staff accounts registered during this period", target: "customer-report", tone: "green" },
        { label: "Cancellation rate", value: `${kpis.cancellation_rate}%`, detail: "Cancelled orders divided by all period orders", target: "order-report", tone: "red" },
        { label: "Low stock", value: kpis.low_stock_products, detail: `Active products with 1 to ${kpis.stock_threshold} units`, target: "inventory-report", tone: "amber" },
        { label: "Repeat customers", value: `${kpis.repeat_customer_rate}%`, detail: "Period buyers with two or more period orders", target: "customer-report", tone: "blue" },
    ] : [];

    return (
        <div className="business-analytics" data-theme={theme}>
            <div className="ba-frame">
                <aside className="ba-sidebar" aria-label="Analytics sections">
                    <Link className="ba-brand" to="/admin" title="Return to admin dashboard">
                        <span className="ba-brand-mark">SH</span>
                        <div><strong>ShopHubAI</strong><small>Business intelligence</small></div>
                    </Link>
                    <span className="ba-side-label">WORKSPACE</span>
                    <a className="ba-side-link active" href="#overview">Overview <span>01</span></a>
                    <a className="ba-side-link" href="#sales-report">Sales &amp; payments <span>02</span></a>
                    <a className="ba-side-link" href="#product-report">Products <span>03</span></a>
                    <a className="ba-side-link" href="#inventory-report">Inventory <span>04</span></a>
                    <a className="ba-side-link" href="#customer-report">Customers <span>05</span></a>
                    <div className="ba-sidebar-note">
                        <span className="ba-live-dot" />
                        <span>Live from your store database</span>
                    </div>
                </aside>

                <main className="ba-main" id="overview">
                    <header className="ba-header">
                        <div>
                            <p className="ba-eyebrow">STORE PERFORMANCE / REPORTING</p>
                            <h1>Business intelligence</h1>
                            <p className="ba-subtitle">A clear read on sales, customers and stock.</p>
                        </div>
                        <div className="ba-header-actions">
                            <label className="ba-theme-control">
                                <span>Appearance</span>
                                <select value={theme} onChange={(event) => setTheme(event.target.value)} aria-label="Appearance">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">System</option>
                                </select>
                            </label>
                            <button className="ba-button secondary" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} title="Refresh report">
                                <span aria-hidden="true">↻</span> Refresh
                            </button>
                            <button className="ba-button primary" type="button" onClick={() => data && downloadReport(data)} disabled={!data} title="Download filtered report as CSV">
                                <span aria-hidden="true">↓</span> Export CSV
                            </button>
                            <button className="ba-icon-button" type="button" onClick={() => window.print()} aria-label="Print report" title="Print report">⎙</button>
                        </div>
                    </header>

                    <section className="ba-filter-row" aria-label="Report filters">
                        <div className="ba-filter-group">
                            <span className="ba-filter-label">PERIOD</span>
                            <div className="ba-segmented" role="group" aria-label="Quick date range">
                                {[7, 30, 90].map((days) => (
                                    <button key={days} className={rangeChoice === String(days) ? "selected" : ""} type="button" onClick={() => selectPreset(days)}>
                                        {days} days
                                    </button>
                                ))}
                            </div>
                            <div className="ba-custom-range">
                                <label><span className="sr-only">Start date</span><input type="date" value={customStart} max={customEnd || today()} onChange={(event) => setCustomStart(event.target.value)} /></label>
                                <span>to</span>
                                <label><span className="sr-only">End date</span><input type="date" value={customEnd} min={customStart} max={today()} onChange={(event) => setCustomEnd(event.target.value)} /></label>
                                <button type="button" className={`ba-apply ${rangeChoice === "custom" ? "selected" : ""}`} onClick={applyCustomRange}>Apply</button>
                            </div>
                        </div>
                        <div className="ba-filter-group granularity-filter">
                            <span className="ba-filter-label">TREND BY</span>
                            <div className="ba-segmented" role="group" aria-label="Sales trend granularity">
                                {["daily", "weekly", "monthly"].map((period) => (
                                    <button key={period} className={granularity === period ? "selected" : ""} type="button" onClick={() => setGranularity(period)}>
                                        {period[0].toUpperCase() + period.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="ba-range-caption">{reportRange.start && reportRange.end ? `${formatDate(reportRange.start)} — ${formatDate(reportRange.end)}` : "Choose a reporting period"}</p>
                    </section>

                    {error && <div className="ba-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}

                    {loading && !data ? (
                        <div className="ba-loading" role="status"><span className="ba-spinner" />Loading store analytics…</div>
                    ) : data ? (
                        <>
                            {loading && <div className="ba-updating" role="status">Updating report…</div>}
                            <section className="ba-kpi-grid" aria-label="Key performance indicators">
                                {cards.map((card) => (
                                    <button className={`ba-kpi-card ${card.tone}`} key={card.label} type="button" onClick={() => jumpTo(card.target)} title={card.detail}>
                                        <span className="ba-kpi-label">{card.label}<span className="ba-info" aria-hidden="true">i</span></span>
                                        <strong>{card.value}</strong>
                                        <span className="ba-kpi-detail">{card.detail}</span>
                                    </button>
                                ))}
                            </section>

                            <section className="ba-section-grid" id="sales-report">
                                <article className="ba-panel ba-trend-panel">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">REVENUE PERFORMANCE</p><h2>Successful sales trend</h2></div>
                                        <span className="ba-legend"><i /> Verified payment</span>
                                    </div>
                                    <SalesTrend points={data.sales_trend} />
                                </article>
                                <article className="ba-panel" id="order-report">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">ORDER MIX</p><h2>Orders by status</h2></div>
                                        <span className="ba-panel-total">{kpis.orders} total</span>
                                    </div>
                                    <Breakdown rows={data.order_statuses} labelKey="status" color="blue" />
                                    <div className="ba-divider" />
                                    <p className="ba-mini-heading">Payment status</p>
                                    <Breakdown rows={data.payment_statuses} labelKey="payment_status" color="amber" />
                                </article>
                            </section>

                            <section className="ba-section-grid product-grid" id="product-report">
                                <article className="ba-panel">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">MERCHANDISING</p><h2>Category sales</h2></div>
                                        <span className="ba-panel-total">Paid orders only</span>
                                    </div>
                                    <Breakdown rows={data.category_sales} labelKey="name" money color="green" />
                                </article>
                                <article className="ba-panel ba-recommendation-panel">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">DISCOVERY</p><h2>Recommendation activity</h2></div>
                                        <span className="ba-panel-total">Tracked events</span>
                                    </div>
                                    <div className="ba-event-grid">
                                        <div><span>Impressions</span><strong>{data.recommendations.impressions}</strong></div>
                                        <div><span>Clicks</span><strong>{data.recommendations.clicks}</strong></div>
                                        <div><span>Click-through</span><strong>{data.recommendations.click_through_rate}%</strong></div>
                                        <div><span>Product views</span><strong>{data.recommendations.views}</strong></div>
                                        <div><span>Wishlist adds</span><strong>{data.recommendations.wishlist_additions}</strong></div>
                                        <div><span>Cart adds</span><strong>{data.recommendations.cart_additions}</strong></div>
                                    </div>
                                    <p className="ba-disclaimer">Purchase events are shown as tracked; recommendation-attributed revenue is unavailable because events are not linked to verified orders.</p>
                                </article>
                            </section>

                            <section className="ba-panel ba-table-panel">
                                <div className="ba-panel-heading">
                                    <div><p className="ba-eyebrow">TOP PERFORMERS</p><h2>Best-selling products</h2></div>
                                    <span className="ba-panel-total">Revenue from successful payments</span>
                                </div>
                                <div className="ba-table-wrap">
                                    <table>
                                        <thead><tr><th>Product</th><th>SKU</th><th>Units sold</th><th>Revenue</th></tr></thead>
                                        <tbody>
                                            {data.top_products.length ? data.top_products.map((product, index) => (
                                                <tr key={product.id}><td><span className="ba-rank">{String(index + 1).padStart(2, "0")}</span>{product.name}</td><td>{product.sku}</td><td>{product.quantity}</td><td>{formatMoney(product.revenue)}</td></tr>
                                            )) : <tr><td className="ba-empty-cell" colSpan="4">No paid product sales for this period.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="ba-section-grid ba-bottom-grid" id="inventory-report">
                                <article className="ba-panel ba-table-panel">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">STOCK CONTROL</p><h2>Inventory watch</h2></div>
                                        <span className="ba-panel-total">Active products at 5 units or below</span>
                                    </div>
                                    <div className="ba-table-wrap">
                                        <table>
                                            <thead><tr><th>Product</th><th>Category</th><th>On hand</th></tr></thead>
                                            <tbody>
                                                {data.inventory.length ? data.inventory.map((product) => (
                                                    <tr key={product.sku}><td>{product.name}<small className="ba-table-sub">{product.sku}</small></td><td>{product.category__name}</td><td><span className={`ba-stock ${product.stock === 0 ? "empty" : "low"}`}>{product.stock === 0 ? "Out of stock" : `${product.stock} left`}</span></td></tr>
                                                )) : <tr><td className="ba-empty-cell" colSpan="3">No active products at or below the stock threshold.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>
                                <article className="ba-panel ba-customer-panel" id="customer-report">
                                    <div className="ba-panel-heading">
                                        <div><p className="ba-eyebrow">CUSTOMER MOMENTUM</p><h2>Customer snapshot</h2></div>
                                    </div>
                                    <div className="ba-customer-total"><strong>{kpis.registered_customers.toLocaleString("en-IN")}</strong><span>registered customers</span></div>
                                    <p className="ba-mini-heading">New customer registrations</p>
                                    <CustomerTrend points={data.customer_trend} />
                                    <div className="ba-customer-line"><span>Joined this period</span><strong>{kpis.new_customers}</strong></div>
                                    <div className="ba-customer-line"><span>Repeat buyer rate</span><strong>{kpis.repeat_customer_rate}%</strong></div>
                                    <div className="ba-customer-line"><span>Delivered orders</span><strong>{kpis.delivered_orders}</strong></div>
                                    <p className="ba-disclaimer">Repeat buyer rate counts customers with at least two orders in the selected period.</p>
                                </article>
                            </section>

                            <footer className="ba-footer">
                                <span>Sales include verified successful payments only. No refunds are recorded in the current payment model.</span>
                                <span>Report period: {formatDate(data.period.start)} — {formatDate(data.period.end)}</span>
                            </footer>
                        </>
                    ) : !loading && !error ? (
                        <div className="ba-empty-state">No report data is available.</div>
                    ) : null}
                </main>
            </div>
        </div>
    );
}

export default BusinessAnalytics;