import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// ============================================================
// HELPERS
// ============================================================

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function getCustomerName(customer) {
  return `${customer?.first_name || ""} ${
    customer?.last_name || ""
  }`.trim();
}


// ============================================================
// APP
// ============================================================

function App() {
  const [page, setPage] = useState("dashboard");

  const [dashboard, setDashboard] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [churn, setChurn] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [uploading, setUploading] = useState(false);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadDashboard();
    loadAnalytics();
  }, []);


  // ==========================================================
  // PAGE LOAD
  // ==========================================================

  useEffect(() => {
    if (page === "customers") {
      loadCustomers();
    }

    if (page === "analytics") {
      loadAnalytics();
    }

    if (page === "churn") {
      loadChurn();
    }
  }, [page]);


  // ==========================================================
  // DASHBOARD
  // ==========================================================

  async function loadDashboard() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/dashboard`
      );

      if (!response.ok) {
        throw new Error("Dashboard request failed");
      }

      const data = await response.json();

      if (data.success) {
        setDashboard(data);
      } else {
        setMessage(
          data.error ||
            data.message ||
            "Dashboard failed."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // CUSTOMERS
  // ==========================================================

  async function loadCustomers() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/customers`
      );

      if (!response.ok) {
        throw new Error("Customers request failed");
      }

      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        setMessage(
          data.error ||
            data.message ||
            "Customers failed."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // ANALYTICS
  // ==========================================================

  async function loadAnalytics() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/analytics`
      );

      if (!response.ok) {
        throw new Error("Analytics request failed");
      }

      const data = await response.json();

      if (data.success) {
        setAnalytics(data);
      } else {
        setMessage(
          data.error ||
            data.message ||
            "Analytics failed."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // CHURN
  // ==========================================================

  async function loadChurn() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/churn-risk`
      );

      if (!response.ok) {
        throw new Error("Churn request failed");
      }

      const data = await response.json();

      if (data.success) {
        setChurn(data);
      } else {
        setMessage(
          data.error ||
            data.message ||
            "Churn risk failed."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load churn risk.");
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // CSV UPLOAD
  // ==========================================================

  async function uploadCSV(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setMessage("Please select a CSV file.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API}/api/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload request failed");
      }

      const data = await response.json();

      if (!data.success) {
        setMessage(
          data.error ||
            data.message ||
            "CSV upload failed."
        );
        return;
      }

      setMessage(
        `CSV uploaded successfully. ${
          data.inserted || 0
        } inserted, ${
          data.updated || 0
        } updated.`
      );


      // --------------------------------------------------------
      // REFRESH ALL IMPORTANT DATA
      // --------------------------------------------------------

      await Promise.all([
        loadDashboard(),
        loadAnalytics(),
        loadCustomers(),
        loadChurn(),
      ]);

    } catch (error) {
      console.error(error);
      setMessage("CSV upload failed.");
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }


  // ==========================================================
  // FILTERED CUSTOMERS
  // ==========================================================

  const filteredCustomers = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim();

    return customers.filter((customer) => {
      const name =
        getCustomerName(customer).toLowerCase();

      const email =
        (customer.email || "").toLowerCase();

      const city =
        (customer.city || "").toLowerCase();

      const matchesSearch =
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        city.includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        customer.customer_status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    customers,
    search,
    statusFilter,
  ]);


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  function navigateTo(targetPage) {
    setMessage("");
    setPage(targetPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="app">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            C
          </div>

          <div>

            <div className="brand-name">
              Customer<span>IQ</span>
            </div>

            <div className="brand-subtitle">
              Customer Intelligence
            </div>

          </div>

        </div>


        <div className="nav-title">
          WORKSPACE
        </div>


        <nav>

          <button
            className={
              page === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigateTo("dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </button>


          <button
            className={
              page === "customers"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigateTo("customers")
            }
          >
            <span>◉</span>
            Customers
          </button>


          <button
            className={
              page === "analytics"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigateTo("analytics")
            }
          >
            <span>⌁</span>
            Analytics
          </button>


          <button
            className={
              page === "churn"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigateTo("churn")
            }
          >
            <span>△</span>
            Churn Risk
          </button>

        </nav>


        <div className="nav-title data-title">
          DATA
        </div>


        <label className="upload-side">

          <span>＋</span>

          {uploading
            ? "Uploading..."
            : "Upload CSV"}

          <input
            type="file"
            accept=".csv"
            onChange={uploadCSV}
            disabled={uploading}
          />

        </label>


        <div className="sidebar-bottom">

          <button
            className="nav-item"
            onClick={() =>
              setMessage(
                "Settings are ready for future configuration."
              )
            }
          >
            <span>⚙</span>
            Settings
          </button>


          <div className="profile">

            <div className="avatar">
              A
            </div>

            <div>
              <strong>
                Administrator
              </strong>

              <small>
                Workspace
              </small>
            </div>

          </div>

        </div>

      </aside>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="main">

        <header className="topbar">

          <div>

            <div className="breadcrumb">
              Workspace /{" "}
              {page === "dashboard"
                ? "Dashboard"
                : page === "customers"
                ? "Customers"
                : page === "analytics"
                ? "Analytics"
                : "Churn Risk"}
            </div>

          </div>


          <label className="upload-button">

            ＋ Upload Data

            <input
              type="file"
              accept=".csv"
              onChange={uploadCSV}
              disabled={uploading}
            />

          </label>

        </header>


        {/* ====================================================
            TOAST
        ==================================================== */}

        {message && (

          <div className="toast">

            <span>
              {message}
            </span>

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>

          </div>

        )}


        {/* ====================================================
            DASHBOARD
        ==================================================== */}

        {page === "dashboard" && (

          <Dashboard
            data={dashboard}
            analytics={analytics}
            loading={loading}
            onRefresh={async () => {
              await Promise.all([
                loadDashboard(),
                loadAnalytics(),
              ]);
            }}
            onViewCustomers={() =>
              navigateTo("customers")
            }
          />

        )}


        {/* ====================================================
            CUSTOMERS
        ==================================================== */}

        {page === "customers" && (

          <Customers
            customers={filteredCustomers}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={
              setSelectedCustomer
            }
            loading={loading}
            onRefresh={loadCustomers}
          />

        )}


        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        {page === "analytics" && (

          <Analytics
            data={analytics}
            loading={loading}
            onRefresh={loadAnalytics}
          />

        )}


        {/* ====================================================
            CHURN
        ==================================================== */}

        {page === "churn" && (

          <ChurnRisk
            data={churn}
            loading={loading}
            onRefresh={loadChurn}
          />

        )}

      </main>

    </div>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({
  data,
  analytics,
  loading,
  onRefresh,
  onViewCustomers,
}) {

  if (loading && !data) {
    return (
      <div className="loading">
        Loading dashboard...
      </div>
    );
  }


  if (!data) {
    return (
      <div className="empty">
        Dashboard data unavailable.
      </div>
    );
  }


  // ----------------------------------------------------------
  // IMPORTANT:
  // Revenue comes from /api/analytics
  // NOT /api/dashboard
  // ----------------------------------------------------------

  const monthlyRevenue =
    analytics?.monthly_revenue || [];


  const maxRevenue = Math.max(
    ...monthlyRevenue.map(
      (item) =>
        Number(item.revenue) || 0
    ),
    1
  );


  return (
    <section className="content">

      {/* ======================================================
          HEADING
      ====================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            Overview of your customer intelligence
          </p>

        </div>


        <button
          className="refresh"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="cards">

        <Kpi
          icon="◉"
          label="Total Customers"
          value={
            data.total_customers
          }
          text="Customers in database"
        />


        <Kpi
          icon="₹"
          label="Total Revenue"
          value={money(
            data.total_revenue
          )}
          text="From completed orders"
        />


        <Kpi
          icon="✓"
          label="Completed Orders"
          value={
            data.completed_orders
          }
          text="Successful transactions"
        />


        <Kpi
          icon="₹"
          label="Average Order Value"
          value={money(
            data.average_order_value
          )}
          text="Average completed order"
        />

      </div>


      {/* ======================================================
          MAIN CHART GRID
      ====================================================== */}

      <div className="grid-2">


        {/* ====================================================
            REVENUE
        ==================================================== */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Revenue Overview
              </h2>

              <p>
                Monthly completed-order revenue
              </p>

            </div>

          </div>


          {monthlyRevenue.length === 0 ? (

            <div className="empty-chart">
              No revenue data available.
            </div>

          ) : (

            <div className="bar-chart">

              {monthlyRevenue.map(
                (item) => {

                  const revenue =
                    Number(
                      item.revenue
                    ) || 0;

                  const height =
                    Math.max(
                      8,
                      (revenue /
                        maxRevenue) *
                        100
                    );

                  return (

                    <div
                      className="bar-column"
                      key={item.month}
                    >

                      <div className="bar-value">
                        {money(revenue)}
                      </div>


                      <div className="bar-track">

                        <div
                          className="bar"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                      </div>


                      <span>
                        {item.month}
                      </span>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>


        {/* ====================================================
            CUSTOMER STATUS
        ==================================================== */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Customer Status
              </h2>

              <p>
                Current customer distribution
              </p>

            </div>

          </div>


          <div className="status-box">

            <div className="status-circle">

              <strong>
                {data.total_customers}
              </strong>

              <span>
                Total
              </span>

            </div>


            <div className="status-list">

              <div>

                <span className="dot active-dot" />

                <span>
                  Active
                </span>

                <strong>
                  {data.active_customers}
                </strong>

              </div>


              <div>

                <span className="dot inactive-dot" />

                <span>
                  Inactive
                </span>

                <strong>
                  {data.inactive_customers}
                </strong>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          RECENT CUSTOMERS
      ====================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Recent Customers
            </h2>

            <p>
              Latest customer records
            </p>

          </div>


          <button
            className="link-button"
            onClick={onViewCustomers}
          >
            View all →
          </button>

        </div>


        <CustomerTable
          customers={
            data.recent_customers || []
          }
          compact
        />

      </div>

    </section>
  );
}


// ============================================================
// KPI
// ============================================================

function Kpi({
  icon,
  label,
  value,
  text,
}) {

  return (
    <div className="kpi">

      <div className="kpi-top">

        <span className="kpi-icon">
          {icon}
        </span>

        <span className="kpi-label">
          {label}
        </span>

      </div>


      <div className="kpi-value">
        {value}
      </div>


      <div className="kpi-text">
        {text}
      </div>

    </div>
  );
}


// ============================================================
// CUSTOMERS
// ============================================================

function Customers({
  customers,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  selectedCustomer,
  setSelectedCustomer,
  loading,
  onRefresh,
}) {

  return (
    <section className="content">

      <div className="page-heading">

        <div>

          <h1>
            Customers
          </h1>

          <p>
            Manage and explore your customer records
          </p>

        </div>


        <button
          className="refresh"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="filters">

        <input
          className="search"
          placeholder="Search customer, email or city..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />


        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          <option value="All">
            All
          </option>

          <option value="Active">
            Active
          </option>

          <option value="Inactive">
            Inactive
          </option>

        </select>

      </div>


      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="panel">

        <div className="table-top">

          <div>

            <strong>
              {customers.length}
            </strong>{" "}
            customers

          </div>

        </div>


        {loading ? (

          <div className="loading">
            Loading customers...
          </div>

        ) : (

          <CustomerTable
            customers={customers}
            onView={
              setSelectedCustomer
            }
          />

        )}

      </div>


      {/* ======================================================
          CUSTOMER MODAL
      ====================================================== */}

      {selectedCustomer && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedCustomer(null)
          }
        >

          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={() =>
                setSelectedCustomer(null)
              }
            >
              ×
            </button>


            <div className="customer-profile">

              <div className="large-avatar">

                {selectedCustomer.first_name?.[0] ||
                  "C"}

              </div>


              <div>

                <h2>
                  {getCustomerName(
                    selectedCustomer
                  )}
                </h2>

                <p>
                  {selectedCustomer.email}
                </p>

              </div>

            </div>


            <div className="detail-grid">

              <Detail
                label="City"
                value={
                  selectedCustomer.city
                }
              />

              <Detail
                label="Country"
                value={
                  selectedCustomer.country
                }
              />

              <Detail
                label="Gender"
                value={
                  selectedCustomer.gender
                }
              />

              <Detail
                label="Age"
                value={
                  selectedCustomer.age
                }
              />

              <Detail
                label="Status"
                value={
                  selectedCustomer.customer_status
                }
              />

              <Detail
                label="Signup Date"
                value={
                  selectedCustomer.signup_date
                }
              />

            </div>

          </div>

        </div>

      )}

    </section>
  );
}


// ============================================================
// DETAIL
// ============================================================

function Detail({
  label,
  value,
}) {

  return (
    <div className="detail">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}


// ============================================================
// CUSTOMER TABLE
// ============================================================

function CustomerTable({
  customers,
  onView,
  compact = false,
}) {

  if (!customers.length) {

    return (
      <div className="empty">
        No customers found.
      </div>
    );
  }


  return (
    <div className="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>
              Customer
            </th>

            <th>
              Email
            </th>

            <th>
              City
            </th>

            <th>
              Status
            </th>

            {!compact && (
              <th>
                Signup Date
              </th>
            )}

            {onView && (
              <th>
                Action
              </th>
            )}

          </tr>

        </thead>


        <tbody>

          {customers.map(
            (customer) => (

              <tr
                key={
                  customer.customer_id
                }
              >

                <td>

                  <div className="customer-cell">

                    <div className="avatar small">

                      {customer.first_name?.[0] ||
                        "C"}

                    </div>


                    <strong>
                      {getCustomerName(
                        customer
                      )}
                    </strong>

                  </div>

                </td>


                <td>
                  {customer.email}
                </td>


                <td>
                  {customer.city || "—"}
                </td>


                <td>

                  <span
                    className={
                      customer.customer_status ===
                      "Active"
                        ? "badge active"
                        : "badge inactive"
                    }
                  >
                    {customer.customer_status ||
                      "Unknown"}
                  </span>

                </td>


                {!compact && (

                  <td>
                    {customer.signup_date ||
                      "—"}
                  </td>

                )}


                {onView && (

                  <td>

                    <button
                      className="view-button"
                      onClick={() =>
                        onView(customer)
                      }
                    >
                      View
                    </button>

                  </td>

                )}

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>
  );
}


// ============================================================
// ANALYTICS
// ============================================================

function Analytics({
  data,
  loading,
  onRefresh,
}) {

  if (loading && !data) {

    return (
      <div className="loading">
        Loading analytics...
      </div>
    );
  }


  if (!data) {

    return (
      <section className="content">

        <div className="empty">
          Analytics data unavailable.
        </div>

      </section>
    );
  }


  const revenue =
    data.monthly_revenue || [];

  const customers =
    data.customer_revenue || [];


  const positiveCustomers =
    customers.filter(
      (customer) =>
        Number(customer.revenue) > 0
    );


  const maxRevenue = Math.max(
    ...revenue.map(
      (item) =>
        Number(item.revenue) || 0
    ),
    1
  );


  const maxCustomerRevenue =
    Math.max(
      ...customers.map(
        (item) =>
          Number(item.revenue) || 0
      ),
      1
    );


  return (
    <section className="content">

      {/* ======================================================
          HEADING
      ====================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Analytics
          </h1>

          <p>
            Understand revenue and customer contribution
          </p>

        </div>


        <button
          className="refresh"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="cards">

        <Kpi
          icon="✓"
          label="Completed Orders"
          value={
            data.completed_orders
          }
          text="Successful transactions"
        />


        <Kpi
          icon="₹"
          label="Total Revenue"
          value={money(
            data.total_revenue
          )}
          text="Completed orders"
        />


        <Kpi
          icon="₹"
          label="Average Order Value"
          value={money(
            data.average_order_value
          )}
          text="Per completed order"
        />

      </div>


      {/* ======================================================
          ANALYTICS GRID
      ====================================================== */}

      <div className="grid-2">


        {/* ====================================================
            REVENUE TREND
        ==================================================== */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Revenue Trend
              </h2>

              <p>
                Monthly completed-order revenue
              </p>

            </div>

          </div>


          {revenue.length === 0 ? (

            <div className="empty-chart">
              No revenue data available.
            </div>

          ) : (

            <div className="bar-chart analytics-chart">

              {revenue.map(
                (item) => {

                  const amount =
                    Number(
                      item.revenue
                    ) || 0;

                  const height =
                    Math.max(
                      8,
                      (amount /
                        maxRevenue) *
                        100
                    );

                  return (

                    <div
                      className="bar-column"
                      key={item.month}
                    >

                      <div className="bar-value">
                        {money(amount)}
                      </div>


                      <div className="bar-track">

                        <div
                          className="bar"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                      </div>


                      <span>
                        {item.month}
                      </span>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>


        {/* ====================================================
            REVENUE BY CUSTOMER
        ==================================================== */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Revenue by Customer
              </h2>

              <p>
                Customer contribution
              </p>

            </div>

          </div>


          {positiveCustomers.length === 0 ? (

            <div className="empty-chart">
              No customer revenue data.
            </div>

          ) : (

            <div className="customer-revenue-list">

              {positiveCustomers
                .slice(0, 8)
                .map(
                  (customer) => {

                    const percentage =
                      Math.min(
                        100,
                        (Number(
                          customer.revenue
                        ) /
                          maxCustomerRevenue) *
                          100
                      );

                    return (

                      <div
                        className="revenue-row"
                        key={
                          customer.customer_id
                        }
                      >

                        <div>

                          <strong>
                            {
                              customer.customer_name
                            }
                          </strong>


                          <div className="progress">

                            <span
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>


                        <strong>
                          {money(
                            customer.revenue
                          )}
                        </strong>

                      </div>

                    );
                  }
                )}

            </div>

          )}

        </div>

      </div>


      {/* ======================================================
          CUSTOMER REVENUE DETAILS
      ====================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Customer Revenue Details
            </h2>

            <p>
              Revenue generated by each customer
            </p>

          </div>

        </div>


        {customers.length === 0 ? (

          <div className="empty">
            No customer revenue data.
          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Customer
                  </th>

                  <th>
                    Customer ID
                  </th>

                  <th>
                    Revenue
                  </th>

                </tr>

              </thead>


              <tbody>

                {customers.map(
                  (customer) => (

                    <tr
                      key={
                        customer.customer_id
                      }
                    >

                      <td>
                        <strong>
                          {
                            customer.customer_name
                          }
                        </strong>
                      </td>


                      <td>
                        #{customer.customer_id}
                      </td>


                      <td>
                        <strong>
                          {money(
                            customer.revenue
                          )}
                        </strong>
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
}


// ============================================================
// CHURN RISK
// ============================================================

function ChurnRisk({
  data,
  loading,
  onRefresh,
}) {

  if (loading && !data) {

    return (
      <div className="loading">
        Calculating churn risk...
      </div>
    );
  }


  if (!data) {

    return (
      <section className="content">

        <div className="empty">
          Churn data unavailable.
        </div>

      </section>
    );
  }


  const customers =
    data.customers || [];


  return (
    <section className="content">

      {/* ======================================================
          HEADING
      ====================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Churn Risk
          </h1>

          <p>
            Identify customers who may need attention
          </p>

        </div>


        <button
          className="refresh"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ======================================================
          RISK SUMMARY
      ====================================================== */}

      <div className="risk-summary">

        <RiskCard
          label="High Risk"
          value={
            data.summary?.high || 0
          }
          className="high"
        />


        <RiskCard
          label="Medium Risk"
          value={
            data.summary?.medium || 0
          }
          className="medium"
        />


        <RiskCard
          label="Low Risk"
          value={
            data.summary?.low || 0
          }
          className="low"
        />


        <RiskCard
          label="Total Customers"
          value={
            data.summary?.total || 0
          }
          className="total"
        />

      </div>


      {/* ======================================================
          RISK TABLE
      ====================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Customer Risk Analysis
            </h2>

            <p>
              Based on completed order activity
            </p>

          </div>

        </div>


        {customers.length === 0 ? (

          <div className="empty">
            No churn risk data available.
          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Customer
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Orders
                  </th>

                  <th>
                    Total Spent
                  </th>

                  <th>
                    Last Order
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Reason
                  </th>

                </tr>

              </thead>


              <tbody>

                {customers.map(
                  (customer) => (

                    <tr
                      key={
                        customer.customer_id
                      }
                    >

                      <td>

                        <div className="customer-cell">

                          <div className="avatar small">

                            {customer.customer_name?.[0] ||
                              "C"}

                          </div>


                          <div>

                            <strong>
                              {
                                customer.customer_name
                              }
                            </strong>

                            <small>
                              {
                                customer.email
                              }
                            </small>

                          </div>

                        </div>

                      </td>


                      <td>

                        <span
                          className={
                            customer.customer_status ===
                            "Active"
                              ? "badge active"
                              : "badge inactive"
                          }
                        >
                          {
                            customer.customer_status
                          }
                        </span>

                      </td>


                      <td>
                        {
                          customer.completed_orders
                        }
                      </td>


                      <td>
                        {money(
                          customer.total_spent
                        )}
                      </td>


                      <td>
                        {
                          customer.last_order_date ||
                          "No orders"
                        }
                      </td>


                      <td>

                        <span
                          className={`risk-badge ${
                            customer.risk?.toLowerCase() ||
                            "low"
                          }`}
                        >
                          {
                            customer.risk
                          }
                        </span>

                      </td>


                      <td>
                        {
                          customer.reason
                        }
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
}


// ============================================================
// RISK CARD
// ============================================================

function RiskCard({
  label,
  value,
  className,
}) {

  return (
    <div
      className={`risk-card ${className}`}
    >

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default App;