import { useEffect, useState } from "react";

import { getProducts } from "../services/api";
import ProductCard from "./ProductCard";
import "../styles/Products.css";

function Products() {
  // =====================================================
  // PRODUCTS
  // =====================================================

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =====================================================
  // PAGINATION
  // =====================================================

  const [currentPage, setCurrentPage] = useState(1);

  const [totalProducts, setTotalProducts] = useState(0);

  const [nextPage, setNextPage] = useState(null);

  const [previousPage, setPreviousPage] = useState(null);

  // =====================================================
  // FILTERS
  // =====================================================

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("");

  const [brand, setBrand] = useState("");

  const [minPrice, setMinPrice] = useState("");

  const [maxPrice, setMaxPrice] = useState("");

  const [inStock, setInStock] = useState("");

  // =====================================================
  // SORTING
  // =====================================================

  const [ordering, setOrdering] = useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);

        setError("");

        const data = await getProducts({
          search: search,

          category: category,

          brand: brand,

          min_price: minPrice,

          max_price: maxPrice,

          in_stock: inStock,

          ordering: ordering,

          page: currentPage,
        });

        // =========================================
        // PRODUCTS
        // =========================================

        setProducts(data.results || []);

        // =========================================
        // TOTAL PRODUCTS
        // =========================================

        setTotalProducts(data.count || 0);

        // =========================================
        // PAGINATION
        // =========================================

        setNextPage(data.next || null);

        setPreviousPage(data.previous || null);
      } catch (err) {
        console.error("Products Page Error:", err);

        setError("Unable to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    inStock,
    ordering,
    currentPage,
  ]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (event) => {
    setSearch(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // CATEGORY
  // =====================================================

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // BRAND
  // =====================================================

  const handleBrandChange = (event) => {
    setBrand(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // MIN PRICE
  // =====================================================

  const handleMinPriceChange = (event) => {
    setMinPrice(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // MAX PRICE
  // =====================================================

  const handleMaxPriceChange = (event) => {
    setMaxPrice(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // STOCK
  // =====================================================

  const handleStockChange = (event) => {
    setInStock(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // SORTING
  // =====================================================

  const handleOrderingChange = (event) => {
    setOrdering(event.target.value);

    setCurrentPage(1);
  };

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setSearch("");

    setCategory("");

    setBrand("");

    setMinPrice("");

    setMaxPrice("");

    setInStock("");

    setOrdering("");

    setCurrentPage(1);
  };

  // =====================================================
  // PAGE CHANGE
  // =====================================================

  const handlePreviousPage = () => {
    if (previousPage) {
      setCurrentPage((page) => Math.max(page - 1, 1));
    }
  };

  const handleNextPage = () => {
    if (nextPage) {
      setCurrentPage((page) => page + 1);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="products-page">
        <div className="products-error">
          <div className="error-icon">⚠️</div>

          <h2>Something went wrong</h2>

          <p>{error}</p>

          <button
            type="button"
            className="retry-button"
            onClick={() => setCurrentPage((page) => page)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="products-page">
      {/* ================================================= */}
      {/* PAGE HEADER */}
      {/* ================================================= */}

      <section className="products-hero">
        <div className="products-hero-content">
          <span className="section-label">SHOPHUBAI STORE</span>

          <h1>Explore All Products</h1>

          <p>
            Discover amazing products, smart deals and everything you need in
            one place.
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* PRODUCTS SECTION */}
      {/* ================================================= */}

      <section className="products-section">
        {/* ================================================= */}
        {/* SEARCH BAR */}
        {/* ================================================= */}

        <div className="products-search-wrapper">
          <div className="products-search-box">
            <span className="search-icon">🔍</span>

            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search products, brands and more..."
              aria-label="Search products"
            />

            {search && (
              <button
                type="button"
                className="search-clear-button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* MAIN PRODUCT AREA */}
        {/* ================================================= */}

        <div className="products-layout">
          {/* ================================================= */}
          {/* FILTER SIDEBAR */}
          {/* ================================================= */}

          <aside className="products-filters">
            <div className="filters-header">
              <div>
                <span className="section-label">REFINE</span>

                <h3>Filters</h3>
              </div>

              <button
                type="button"
                className="clear-filters-button"
                onClick={clearFilters}
              >
                Clear All
              </button>
            </div>

            {/* ========================================= */}
            {/* CATEGORY */}
            {/* ========================================= */}

            <div className="filter-group">
              <label htmlFor="category">Category</label>

              <select
                id="category"
                value={category}
                onChange={handleCategoryChange}
              >
                <option value="">All Categories</option>

                <option value="1">Electronics</option>

                <option value="2">Fashion</option>

                <option value="3">Home</option>
              </select>
            </div>

            {/* ========================================= */}
            {/* BRAND */}
            {/* ========================================= */}

            <div className="filter-group">
              <label htmlFor="brand">Brand</label>

              <input
                id="brand"
                type="text"
                value={brand}
                onChange={handleBrandChange}
                placeholder="e.g. Apple"
              />
            </div>

            {/* ========================================= */}
            {/* PRICE RANGE */}
            {/* ========================================= */}

            <div className="filter-group">
              <label>Price Range</label>

              <div className="price-inputs">
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={handleMinPriceChange}
                  placeholder="Min ₹"
                />

                <span>—</span>

                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={handleMaxPriceChange}
                  placeholder="Max ₹"
                />
              </div>
            </div>

            {/* ========================================= */}
            {/* STOCK */}
            {/* ========================================= */}

            <div className="filter-group">
              <label htmlFor="stock">Availability</label>

              <select id="stock" value={inStock} onChange={handleStockChange}>
                <option value="">All Products</option>

                <option value="true">In Stock</option>

                <option value="false">Out of Stock</option>
              </select>
            </div>
          </aside>

          {/* ================================================= */}
          {/* PRODUCTS CONTENT */}
          {/* ================================================= */}

          <div className="products-content">
            {/* ================================================= */}
            {/* SECTION HEADER */}
            {/* ================================================= */}

            <div className="section-header">
              <div>
                <span className="section-label">OUR COLLECTION</span>

                <h2>
                  {search ? `Search results for "${search}"` : "All Products"}
                </h2>

                <p>
                  {totalProducts} {totalProducts === 1 ? "product" : "products"}{" "}
                  available
                </p>
              </div>

              {/* ========================================= */}
              {/* SORT */}
              {/* ========================================= */}

              <div className="products-sort">
                <label htmlFor="ordering">Sort by</label>

                <select
                  id="ordering"
                  value={ordering}
                  onChange={handleOrderingChange}
                >
                  <option value="">Relevance</option>

                  <option value="-created_at">Newest</option>

                  <option value="price">Price: Low to High</option>

                  <option value="-price">Price: High to Low</option>

                  <option value="name">Name: A-Z</option>

                  <option value="-name">Name: Z-A</option>
                </select>
              </div>
            </div>

            {/* ================================================= */}
            {/* ACTIVE FILTERS */}
            {/* ================================================= */}

            {loading ? (
              <div className="products-page">
                <div className="products-loading">
                  <div className="home-spinner"></div>

                  <h2>Loading products...</h2>

                  <p>Please wait while we fetch the latest products.</p>
                </div>
              </div>
            ) : (
              (search ||
                category ||
                brand ||
                minPrice ||
                maxPrice ||
                inStock ||
                ordering) && (
                <div className="active-filters">
                  <span>Active filters:</span>

                  {search && (
                    <span className="filter-chip">Search: {search}</span>
                  )}

                  {brand && <span className="filter-chip">Brand: {brand}</span>}

                  {minPrice && (
                    <span className="filter-chip">Min: ₹{minPrice}</span>
                  )}

                  {maxPrice && (
                    <span className="filter-chip">Max: ₹{maxPrice}</span>
                  )}

                  {inStock === "true" && (
                    <span className="filter-chip">In Stock</span>
                  )}

                  {inStock === "false" && (
                    <span className="filter-chip">Out of Stock</span>
                  )}
                </div>
              )
            )}

            {/* ================================================= */}
            {/* EMPTY STATE */}
            {/* ================================================= */}

            {products.length === 0 ? (
              <div className="home-message">
                <span>🔍</span>

                <h3>No Products Found</h3>

                <p>Try changing your search or filters.</p>

                <button
                  type="button"
                  className="retry-button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* ========================================= */}
                {/* PRODUCT GRID */}
                {/* ========================================= */}

                <div className="product-grid">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* ========================================= */}
                {/* PAGINATION */}
                {/* ========================================= */}

                {(nextPage || previousPage) && (
                  <div className="products-pagination">
                    <button
                      type="button"
                      disabled={!previousPage}
                      onClick={handlePreviousPage}
                    >
                      ← Previous
                    </button>

                    <span>
                      Page <strong>{currentPage}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={!nextPage}
                      onClick={handleNextPage}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Products;
