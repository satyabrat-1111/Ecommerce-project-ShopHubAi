
import { useEffect, useState } from "react";

import {
    getAdminProducts,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
} from "../services/adminApi";


function AdminProducts() {

    // =========================================
    // PRODUCTS
    // =========================================

    const [products, setProducts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    // =========================================
    // SEARCH / FILTER
    // =========================================

    const [search, setSearch] = useState("");

    const [category, setCategory] = useState("");

    const [brand, setBrand] = useState("");

    const [isActive, setIsActive] = useState("");

    // =========================================
    // FORM
    // =========================================

    const [showForm, setShowForm] = useState(false);

    const [editingProduct, setEditingProduct] =
        useState(null);

    const [saving, setSaving] = useState(false);

    const [formError, setFormError] = useState("");

    const [imagePreview, setImagePreview] =
        useState("");

    // =========================================
    // FORM DATA
    // =========================================

    const [formData, setFormData] = useState({

        category: "",

        name: "",

        slug: "",

        brand: "",

        description: "",

        price: "",

        discount_price: "",

        sku: "",

        is_active: true,

        image: null,
    });


    // =========================================
    // LOAD PRODUCTS
    // =========================================

    const loadProducts = async () => {

        try {

            setLoading(true);

            setError("");

            const response =
                await getAdminProducts({

                    search: search,

                    category: category,

                    brand: brand,

                    is_active: isActive,

                    ordering: "-created_at",

                });


            const productList =
                Array.isArray(response)
                    ? response
                    : response?.results ||
                      response?.products ||
                      response?.data ||
                      [];


            setProducts(productList);


        } catch (error) {

            console.error(
                "Admin Products Error:",
                error
            );

            setError(
                error.message ||
                "Failed to load products."
            );

        } finally {

            setLoading(false);

        }
    };


    // =========================================
    // INITIAL LOAD
    // =========================================

    useEffect(() => {

        loadProducts();

    }, [search, category, brand, isActive]);


    // =========================================
    // HANDLE INPUT
    // =========================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
            files,
        } = event.target;


        if (name === "image") {

            const file =
                files?.[0] || null;


            setFormData(
                (previous) => ({
                    ...previous,
                    image: file,
                })
            );


            if (file) {

                setImagePreview(
                    URL.createObjectURL(file)
                );

            } else {

                setImagePreview("");

            }

            return;
        }


        setFormData(
            (previous) => ({
                ...previous,

                [name]:
                    type === "checkbox"
                        ? checked
                        : value,
            })
        );
    };


    // =========================================
    // RESET FORM
    // =========================================

    const resetForm = () => {

        setFormData({

            category: "",

            name: "",

            slug: "",

            brand: "",

            description: "",

            price: "",

            discount_price: "",

            sku: "",

            is_active: true,

            image: null,

        });


        setEditingProduct(null);

        setImagePreview("");

        setFormError("");

    };


    // =========================================
    // OPEN ADD FORM
    // =========================================

    const handleAddProduct = () => {

        resetForm();

        setShowForm(true);

    };


    // =========================================
    // OPEN EDIT FORM
    // =========================================

    const handleEditProduct = (product) => {

        setEditingProduct(product);

        setShowForm(true);

        setFormError("");


        setFormData({

            category:
                product.category || "",

            name:
                product.name || "",

            slug:
                product.slug || "",

            brand:
                product.brand || "",

            description:
                product.description || "",

            price:
                product.price ?? "",

            discount_price:
                product.discount_price ?? "",

            sku:
                product.sku || "",

            is_active:
                product.is_active ?? true,

            image: null,

        });


        if (product.image) {

            setImagePreview(
                product.image.startsWith("http")
                    ? product.image
                    : `http://localhost:8000${product.image}`
            );

        } else {

            setImagePreview("");

        }

    };


    // =========================================
    // CLOSE FORM
    // =========================================

    const handleCloseForm = () => {

        if (saving) {
            return;
        }

        setShowForm(false);

        resetForm();

    };


    // =========================================
    // SUBMIT FORM
    // =========================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        try {

            setSaving(true);

            setFormError("");


            // =====================================
            // BASIC VALIDATION
            // =====================================

            if (!formData.category) {

                setFormError(
                    "Please select a category."
                );

                setSaving(false);

                return;
            }


            if (!formData.name.trim()) {

                setFormError(
                    "Product name is required."
                );

                setSaving(false);

                return;
            }


            if (!formData.slug.trim()) {

                setFormError(
                    "Product slug is required."
                );

                setSaving(false);

                return;
            }


            if (!formData.brand.trim()) {

                setFormError(
                    "Brand is required."
                );

                setSaving(false);

                return;
            }


            if (!formData.price) {

                setFormError(
                    "Product price is required."
                );

                setSaving(false);

                return;
            }


            if (!formData.sku.trim()) {

                setFormError(
                    "SKU is required."
                );

                setSaving(false);

                return;
            }


            // =====================================
            // CREATE FORMDATA
            // =====================================

            const data =
                new FormData();


            data.append(
                "category",
                formData.category
            );


            data.append(
                "name",
                formData.name.trim()
            );


            data.append(
                "slug",
                formData.slug.trim()
            );


            data.append(
                "brand",
                formData.brand.trim()
            );


            data.append(
                "description",
                formData.description.trim()
            );


            data.append(
                "price",
                formData.price
            );


            if (
                formData.discount_price !== ""
            ) {

                data.append(
                    "discount_price",
                    formData.discount_price
                );

            }


            data.append(
                "sku",
                formData.sku.trim()
            );


            data.append(
                "is_active",
                formData.is_active
                    ? "true"
                    : "false"
            );


            if (formData.image) {

                data.append(
                    "image",
                    formData.image
                );

            }


            // =====================================
            // UPDATE
            // =====================================

            if (editingProduct) {

                await updateAdminProduct(
                    editingProduct.id,
                    data
                );


                alert(
                    "Product updated successfully."
                );

            }

            // =====================================
            // CREATE
            // =====================================

            else {

                await createAdminProduct(
                    data
                );


                alert(
                    "Product created successfully."
                );

            }


            // =====================================
            // CLOSE + REFRESH
            // =====================================

            setShowForm(false);

            resetForm();

            await loadProducts();


        } catch (error) {

            console.error(
                "Save Product Error:",
                error
            );


            setFormError(
                error.message ||
                "Failed to save product."
            );

        } finally {

            setSaving(false);

        }

    };


    // =========================================
    // DELETE PRODUCT
    // =========================================

    const handleDeleteProduct = async (
        product
    ) => {

        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${product.name}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            setError("");


            await deleteAdminProduct(
                product.id
            );


            alert(
                "Product deleted successfully."
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "Delete Product Error:",
                error
            );


            setError(
                error.message ||
                "Failed to delete product."
            );

        }

    };


    // =========================================
    // AUTO SLUG
    // =========================================

    const generateSlug = () => {

        const slug =
            formData.name
                .toLowerCase()
                .trim()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                );


        setFormData(
            (previous) => ({
                ...previous,
                slug: slug,
            })
        );

    };


    // =========================================
    // LOADING
    // =========================================

    if (
        loading &&
        products.length === 0
    ) {

        return (

            <div
                style={{
                    maxWidth: "1300px",
                    margin: "40px auto",
                    padding: "20px",
                    textAlign: "center",
                }}
            >

                <h2>
                    Loading Products...
                </h2>

            </div>

        );

    }


    // =========================================
    // DASHBOARD
    // =========================================

    return (

        <div
            style={{
                maxWidth: "1300px",
                margin: "40px auto",
                padding: "20px",
            }}
        >

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    marginBottom: "30px",
                    flexWrap: "wrap",
                }}
            >

                <div>

                    <h1
                        style={{
                            marginBottom: "8px",
                        }}
                    >
                        Admin Product Management 🛍️
                    </h1>

                    <p
                        style={{
                            color: "#666",
                            margin: 0,
                        }}
                    >
                        Manage ShopHubAI products.
                    </p>

                </div>


                <button
                    onClick={
                        handleAddProduct
                    }
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "7px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "15px",
                        fontWeight: "600",
                    }}
                >
                    + Add Product
                </button>

            </div>


            {/* ================================= */}
            {/* ERROR */}
            {/* ================================= */}

            {error && (

                <div
                    style={{
                        padding: "15px",
                        marginBottom: "20px",
                        borderRadius: "8px",
                        backgroundColor: "#ffe6e6",
                        color: "#b00020",
                        border:
                            "1px solid #ffb3b3",
                    }}
                >

                    {error}

                    <button
                        onClick={
                            loadProducts
                        }
                        style={{
                            marginLeft: "15px",
                            cursor: "pointer",
                        }}
                    >
                        Retry
                    </button>

                </div>

            )}


            {/* ================================= */}
            {/* FILTERS */}
            {/* ================================= */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                    padding: "20px",
                    marginBottom: "25px",
                    border:
                        "1px solid #ddd",
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                }}
            >

                {/* SEARCH */}

                <input
                    type="text"
                    placeholder="Search product, brand, SKU..."
                    value={search}
                    onChange={(event) =>
                        setSearch(
                            event.target.value
                        )
                    }
                    style={{
                        padding: "11px",
                        border:
                            "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "14px",
                    }}
                />


                {/* CATEGORY */}

                <input
                    type="text"
                    placeholder="Category ID"
                    value={category}
                    onChange={(event) =>
                        setCategory(
                            event.target.value
                        )
                    }
                    style={{
                        padding: "11px",
                        border:
                            "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "14px",
                    }}
                />


                {/* BRAND */}

                <input
                    type="text"
                    placeholder="Brand"
                    value={brand}
                    onChange={(event) =>
                        setBrand(
                            event.target.value
                        )
                    }
                    style={{
                        padding: "11px",
                        border:
                            "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "14px",
                    }}
                />


                {/* ACTIVE */}

                <select
                    value={isActive}
                    onChange={(event) =>
                        setIsActive(
                            event.target.value
                        )
                    }
                    style={{
                        padding: "11px",
                        border:
                            "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "14px",
                    }}
                >

                    <option value="">
                        All Products
                    </option>

                    <option value="true">
                        Active
                    </option>

                    <option value="false">
                        Inactive
                    </option>

                </select>

            </div>


            {/* ================================= */}
            {/* PRODUCT COUNT */}
            {/* ================================= */}

            <div
                style={{
                    marginBottom: "15px",
                    color: "#555",
                }}
            >

                Showing{" "}
                <strong>
                    {products.length}
                </strong>{" "}
                products

            </div>


            {/* ================================= */}
            {/* PRODUCT TABLE */}
            {/* ================================= */}

            <div
                style={{
                    overflowX: "auto",
                    border:
                        "1px solid #ddd",
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                }}
            >

                <table
                    style={{
                        width: "100%",
                        minWidth: "1100px",
                        borderCollapse:
                            "collapse",
                    }}
                >

                    <thead>

                        <tr>

                            <th style={headerStyle}>
                                Image
                            </th>

                            <th style={headerStyle}>
                                ID
                            </th>

                            <th style={headerStyle}>
                                Product
                            </th>

                            <th style={headerStyle}>
                                Category
                            </th>

                            <th style={headerStyle}>
                                Brand
                            </th>

                            <th style={headerStyle}>
                                SKU
                            </th>

                            <th style={headerStyle}>
                                Price
                            </th>

                            <th style={headerStyle}>
                                Status
                            </th>

                            <th style={headerStyle}>
                                Actions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {products.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="9"
                                    style={{
                                        padding: "40px",
                                        textAlign: "center",
                                        color: "#666",
                                    }}
                                >
                                    No products found.
                                </td>

                            </tr>

                        ) : (

                            products.map(
                                (product) => {

                                    const imageUrl =
                                        product.image
                                            ? (
                                                product.image.startsWith(
                                                    "http"
                                                )
                                                    ? product.image
                                                    : `http://localhost:8000${product.image}`
                                            )
                                            : "";


                                    return (

                                        <tr
                                            key={
                                                product.id
                                            }
                                        >

                                            {/* IMAGE */}

                                            <td style={cellStyle}>

                                                {imageUrl ? (

                                                    <img
                                                        src={
                                                            imageUrl
                                                        }
                                                        alt={
                                                            product.name
                                                        }
                                                        style={{
                                                            width:
                                                                "65px",
                                                            height:
                                                                "65px",
                                                            objectFit:
                                                                "cover",
                                                            borderRadius:
                                                                "7px",
                                                            border:
                                                                "1px solid #ddd",
                                                        }}
                                                    />

                                                ) : (

                                                    <span>
                                                        No Image
                                                    </span>

                                                )}

                                            </td>


                                            {/* ID */}

                                            <td style={cellStyle}>
                                                #
                                                {
                                                    product.id
                                                }
                                            </td>


                                            {/* PRODUCT */}

                                            <td style={cellStyle}>

                                                <strong>
                                                    {
                                                        product.name
                                                    }
                                                </strong>

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "12px",
                                                        color:
                                                            "#777",
                                                        marginTop:
                                                            "5px",
                                                    }}
                                                >
                                                    {
                                                        product.slug
                                                    }
                                                </div>

                                            </td>


                                            {/* CATEGORY */}

                                            <td style={cellStyle}>

                                                {
                                                    product.category_name ||
                                                    product.category ||
                                                    "-"
                                                }

                                            </td>


                                            {/* BRAND */}

                                            <td style={cellStyle}>
                                                {
                                                    product.brand ||
                                                    "-"
                                                }
                                            </td>


                                            {/* SKU */}

                                            <td style={cellStyle}>
                                                {
                                                    product.sku ||
                                                    "-"
                                                }
                                            </td>


                                            {/* PRICE */}

                                            <td style={cellStyle}>

                                                ₹
                                                {
                                                    product.discount_price ||
                                                    product.price ||
                                                    0
                                                }

                                                {product.discount_price && (

                                                    <div
                                                        style={{
                                                            fontSize:
                                                                "12px",
                                                            color:
                                                                "#777",
                                                            textDecoration:
                                                                "line-through",
                                                        }}
                                                    >
                                                        ₹
                                                        {
                                                            product.price
                                                        }
                                                    </div>

                                                )}

                                            </td>


                                            {/* STATUS */}

                                            <td style={cellStyle}>

                                                <span
                                                    style={{
                                                        display:
                                                            "inline-block",
                                                        padding:
                                                            "5px 10px",
                                                        borderRadius:
                                                            "20px",
                                                        fontSize:
                                                            "12px",
                                                        backgroundColor:
                                                            product.is_active
                                                                ? "#d4edda"
                                                                : "#f8d7da",
                                                        color:
                                                            product.is_active
                                                                ? "#155724"
                                                                : "#721c24",
                                                    }}
                                                >
                                                    {
                                                        product.is_active
                                                            ? "Active"
                                                            : "Inactive"
                                                    }
                                                </span>

                                            </td>


                                            {/* ACTIONS */}

                                            <td style={cellStyle}>

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap:
                                                            "8px",
                                                    }}
                                                >

                                                    <button
                                                        onClick={() =>
                                                            handleEditProduct(
                                                                product
                                                            )
                                                        }
                                                        style={{
                                                            padding:
                                                                "7px 12px",
                                                            border:
                                                                "none",
                                                            borderRadius:
                                                                "5px",
                                                            backgroundColor:
                                                                "#ffc107",
                                                            cursor:
                                                                "pointer",
                                                        }}
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        onClick={() =>
                                                            handleDeleteProduct(
                                                                product
                                                            )
                                                        }
                                                        style={{
                                                            padding:
                                                                "7px 12px",
                                                            border:
                                                                "none",
                                                            borderRadius:
                                                                "5px",
                                                            backgroundColor:
                                                                "#dc3545",
                                                            color:
                                                                "#fff",
                                                            cursor:
                                                                "pointer",
                                                        }}
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    );

                                }
                            )

                        )}

                    </tbody>

                </table>

            </div>


            {/* ================================= */}
            {/* PRODUCT FORM */}
            {/* ================================= */}

            {showForm && (

                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor:
                            "rgba(0,0,0,0.55)",
                        display: "flex",
                        justifyContent:
                            "center",
                        alignItems:
                            "center",
                        padding: "20px",
                        zIndex: 1000,
                        overflowY: "auto",
                    }}
                >

                    <div
                        style={{
                            width: "100%",
                            maxWidth: "700px",
                            maxHeight:
                                "90vh",
                            overflowY:
                                "auto",
                            backgroundColor:
                                "#fff",
                            borderRadius:
                                "12px",
                            padding:
                                "30px",
                        }}
                    >

                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                                marginBottom:
                                    "25px",
                            }}
                        >

                            <h2
                                style={{
                                    margin: 0,
                                }}
                            >
                                {editingProduct
                                    ? "Edit Product"
                                    : "Add Product"}
                            </h2>


                            <button
                                onClick={
                                    handleCloseForm
                                }
                                disabled={
                                    saving
                                }
                                style={{
                                    border:
                                        "none",
                                    background:
                                        "transparent",
                                    fontSize:
                                        "25px",
                                    cursor:
                                        "pointer",
                                }}
                            >
                                ×
                            </button>

                        </div>


                        {/* FORM ERROR */}

                        {formError && (

                            <div
                                style={{
                                    padding:
                                        "12px",
                                    marginBottom:
                                        "20px",
                                    borderRadius:
                                        "6px",
                                    backgroundColor:
                                        "#ffe6e6",
                                    color:
                                        "#b00020",
                                }}
                            >
                                {formError}
                            </div>

                        )}


                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            {/* CATEGORY */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Category ID *
                                </label>

                                <input
                                    type="number"
                                    name="category"
                                    value={
                                        formData.category
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Example: 1"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* NAME */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Product Name *
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={
                                        formData.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Product name"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* SLUG */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Slug *
                                </label>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        gap:
                                            "8px",
                                    }}
                                >

                                    <input
                                        type="text"
                                        name="slug"
                                        value={
                                            formData.slug
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="product-slug"
                                        style={{
                                            ...inputStyle,
                                            flex: 1,
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            generateSlug
                                        }
                                        style={{
                                            padding:
                                                "10px",
                                            border:
                                                "1px solid #ccc",
                                            borderRadius:
                                                "6px",
                                            cursor:
                                                "pointer",
                                        }}
                                    >
                                        Generate
                                    </button>

                                </div>

                            </div>


                            {/* BRAND */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Brand *
                                </label>

                                <input
                                    type="text"
                                    name="brand"
                                    value={
                                        formData.brand
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Brand"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* SKU */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    SKU *
                                </label>

                                <input
                                    type="text"
                                    name="sku"
                                    value={
                                        formData.sku
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="SKU-001"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* PRICE */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Price *
                                </label>

                                <input
                                    type="number"
                                    name="price"
                                    value={
                                        formData.price
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    min="0"
                                    step="0.01"
                                    placeholder="99999"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* DISCOUNT PRICE */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Discount Price
                                </label>

                                <input
                                    type="number"
                                    name="discount_price"
                                    value={
                                        formData.discount_price
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    min="0"
                                    step="0.01"
                                    placeholder="89999"
                                    style={
                                        inputStyle
                                    }
                                />

                            </div>


                            {/* DESCRIPTION */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    rows="5"
                                    placeholder="Product description"
                                    style={{
                                        ...inputStyle,
                                        resize:
                                            "vertical",
                                    }}
                                />

                            </div>


                            {/* IMAGE */}

                            <div
                                style={
                                    formGroupStyle
                                }
                            >

                                <label>
                                    Product Image
                                </label>

                                <input
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    onChange={
                                        handleChange
                                    }
                                />


                                {imagePreview && (

                                    <div
                                        style={{
                                            marginTop:
                                                "15px",
                                        }}
                                    >

                                        <img
                                            src={
                                                imagePreview
                                            }
                                            alt="Preview"
                                            style={{
                                                width:
                                                    "150px",
                                                height:
                                                    "150px",
                                                objectFit:
                                                    "cover",
                                                borderRadius:
                                                    "8px",
                                                border:
                                                    "1px solid #ddd",
                                            }}
                                        />

                                    </div>

                                )}

                            </div>


                            {/* ACTIVE */}

                            <div
                                style={{
                                    marginBottom:
                                        "25px",
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "10px",
                                }}
                            >

                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={
                                        formData.is_active
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    id="is_active"
                                />

                                <label htmlFor="is_active">
                                    Active Product
                                </label>

                            </div>


                            {/* BUTTONS */}

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "flex-end",
                                    gap:
                                        "10px",
                                }}
                            >

                                <button
                                    type="button"
                                    onClick={
                                        handleCloseForm
                                    }
                                    disabled={
                                        saving
                                    }
                                    style={{
                                        padding:
                                            "11px 20px",
                                        border:
                                            "1px solid #ccc",
                                        borderRadius:
                                            "6px",
                                        backgroundColor:
                                            "#fff",
                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    style={{
                                        padding:
                                            "11px 20px",
                                        border:
                                            "none",
                                        borderRadius:
                                            "6px",
                                        backgroundColor:
                                            "#007bff",
                                        color:
                                            "#fff",
                                        cursor:
                                            "pointer",
                                        fontWeight:
                                            "600",
                                    }}
                                >

                                    {saving
                                        ? "Saving..."
                                        : editingProduct
                                            ? "Update Product"
                                            : "Create Product"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>

    );
}


// =========================================
// STYLES
// =========================================

const headerStyle = {

    border:
        "1px solid #ddd",

    padding:
        "12px",

    textAlign:
        "left",

    backgroundColor:
        "#f5f5f5",

};


const cellStyle = {

    border:
        "1px solid #ddd",

    padding:
        "12px",

};


const formGroupStyle = {

    marginBottom:
        "18px",

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "7px",

};


const inputStyle = {

    width:
        "100%",

    boxSizing:
        "border-box",

    padding:
        "11px",

    border:
        "1px solid #ccc",

    borderRadius:
        "6px",

    fontSize:
        "14px",

};


export default AdminProducts;

