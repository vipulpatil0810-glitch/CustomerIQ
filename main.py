from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import mysql.connector
import pandas as pd
import io
from datetime import date, datetime
from decimal import Decimal


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="CustomerIQ API",
    description="Customer Intelligence Dashboard Backend",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE CONFIG
# ============================================================

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "1313",          # <-- apna MySQL password yaha daalo
    "database": "customer_iq",
}


def get_connection():
    return mysql.connector.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"],
    )


# ============================================================
# HELPER
# ============================================================

def clean_value(value):

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (date, datetime)):
        return str(value)

    return value


def clean_rows(rows):

    cleaned = []

    for row in rows:
        cleaned.append({
            key: clean_value(value)
            for key, value in row.items()
        })

    return cleaned


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "CustomerIQ backend is running",
        "docs": "/docs"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():

    try:

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT 1")

        cursor.fetchone()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "database": "connected"
        }

    except Exception as e:

        return {
            "success": False,
            "database": "connection failed",
            "error": str(e)
        }


# ============================================================
# CUSTOMERS
# ============================================================

@app.get("/api/customers")
def get_customers():

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                customer_id,
                first_name,
                last_name,
                email,
                gender,
                age,
                city,
                country,
                signup_date,
                customer_status,
                created_at
            FROM customers
            ORDER BY customer_id ASC
        """)

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "count": len(rows),
            "customers": clean_rows(rows)
        }

    except Exception as e:

        return {
            "success": False,
            "message": "Failed to load customers.",
            "error": str(e)
        }


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@app.get("/api/dashboard")
def get_dashboard():

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        # Total customers
        cursor.execute("""
            SELECT COUNT(*) AS total_customers
            FROM customers
        """)

        total_customers = cursor.fetchone()["total_customers"]

        # Completed order statistics
        cursor.execute("""
            SELECT
                COUNT(*) AS completed_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0) AS average_order_value
            FROM orders
            WHERE order_status = 'Completed'
        """)

        stats = cursor.fetchone()

        # Customer status
        cursor.execute("""
            SELECT
                customer_status,
                COUNT(*) AS count
            FROM customers
            GROUP BY customer_status
        """)

        status_rows = cursor.fetchall()

        active_customers = 0
        inactive_customers = 0

        for row in status_rows:

            if row["customer_status"] == "Active":
                active_customers = row["count"]

            elif row["customer_status"] == "Inactive":
                inactive_customers = row["count"]

        # Recent customers
        cursor.execute("""
            SELECT
                customer_id,
                first_name,
                last_name,
                email,
                city,
                customer_status,
                signup_date
            FROM customers
            ORDER BY customer_id DESC
            LIMIT 5
        """)

        recent_customers = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,

            "total_customers": int(
                total_customers or 0
            ),

            "total_revenue": float(
                stats["total_revenue"] or 0
            ),

            "completed_orders": int(
                stats["completed_orders"] or 0
            ),

            "average_order_value": float(
                stats["average_order_value"] or 0
            ),

            "active_customers": active_customers,

            "inactive_customers": inactive_customers,

            "recent_customers": clean_rows(
                recent_customers
            )
        }

    except Exception as e:

        return {
            "success": False,
            "message": "Dashboard failed.",
            "error": str(e)
        }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/api/analytics")
def get_analytics():

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        # ----------------------------------------------------
        # Monthly Revenue
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                DATE_FORMAT(order_date, '%b') AS month,
                MONTH(order_date) AS month_number,
                SUM(total_amount) AS revenue
            FROM orders
            WHERE order_status = 'Completed'
            GROUP BY
                MONTH(order_date),
                DATE_FORMAT(order_date, '%b')
            ORDER BY MONTH(order_date)
        """)

        monthly_revenue = cursor.fetchall()

        # ----------------------------------------------------
        # Revenue By Customer
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                c.customer_id,

                CONCAT(
                    c.first_name,
                    ' ',
                    COALESCE(c.last_name, '')
                ) AS customer_name,

                COALESCE(
                    SUM(
                        CASE
                            WHEN o.order_status = 'Completed'
                            THEN o.total_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS revenue

            FROM customers c

            LEFT JOIN orders o
                ON c.customer_id = o.customer_id

            GROUP BY
                c.customer_id,
                c.first_name,
                c.last_name

            ORDER BY revenue DESC
        """)

        customer_revenue = cursor.fetchall()

        # ----------------------------------------------------
        # Overall statistics
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                COUNT(*) AS completed_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0) AS average_order_value
            FROM orders
            WHERE order_status = 'Completed'
        """)

        stats = cursor.fetchone()

        cursor.close()
        conn.close()

        # Remove internal month_number from frontend response
        monthly_result = []

        for item in monthly_revenue:

            monthly_result.append({
                "month": item["month"],
                "revenue": float(
                    item["revenue"] or 0
                )
            })

        customer_result = []

        for item in customer_revenue:

            customer_result.append({
                "customer_id": item["customer_id"],
                "customer_name": item["customer_name"].strip(),
                "revenue": float(
                    item["revenue"] or 0
                )
            })

        return {

            "success": True,

            "completed_orders": int(
                stats["completed_orders"] or 0
            ),

            "total_revenue": float(
                stats["total_revenue"] or 0
            ),

            "average_order_value": float(
                stats["average_order_value"] or 0
            ),

            "monthly_revenue": monthly_result,

            "customer_revenue": customer_result
        }

    except Exception as e:

        return {
            "success": False,
            "message": "Analytics failed.",
            "error": str(e)
        }


# ============================================================
# CHURN RISK
# ============================================================

@app.get("/api/churn-risk")
def get_churn_risk():

    try:

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        # ----------------------------------------------------
        # Customer activity
        # ----------------------------------------------------

        cursor.execute("""
            SELECT

                c.customer_id,

                CONCAT(
                    c.first_name,
                    ' ',
                    COALESCE(c.last_name, '')
                ) AS customer_name,

                c.email,

                c.city,

                c.customer_status,

                COUNT(
                    CASE
                        WHEN o.order_status = 'Completed'
                        THEN o.order_id
                    END
                ) AS completed_orders,

                COALESCE(
                    SUM(
                        CASE
                            WHEN o.order_status = 'Completed'
                            THEN o.total_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_spent,

                MAX(
                    CASE
                        WHEN o.order_status = 'Completed'
                        THEN o.order_date
                    END
                ) AS last_order_date

            FROM customers c

            LEFT JOIN orders o
                ON c.customer_id = o.customer_id

            GROUP BY

                c.customer_id,
                c.first_name,
                c.last_name,
                c.email,
                c.city,
                c.customer_status

            ORDER BY last_order_date ASC
        """)

        customers = cursor.fetchall()

        # ----------------------------------------------------
        # Latest completed order in dataset
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                MAX(order_date) AS latest_order_date
            FROM orders
            WHERE order_status = 'Completed'
        """)

        latest_result = cursor.fetchone()

        reference_date = latest_result[
            "latest_order_date"
        ]

        if not reference_date:
            reference_date = date.today()

        # ----------------------------------------------------
        # Risk calculation
        # ----------------------------------------------------

        result = []

        for customer in customers:

            last_order = customer[
                "last_order_date"
            ]

            if last_order:

                days_since_order = (
                    reference_date - last_order
                ).days

            else:

                days_since_order = 999

            completed_orders = int(
                customer["completed_orders"] or 0
            )

            total_spent = float(
                customer["total_spent"] or 0
            )

            # ----------------------------------------------
            # Risk levels
            # ----------------------------------------------

            if completed_orders == 0:

                risk = "High"

                reason = "No completed orders"

            elif days_since_order > 90:

                risk = "High"

                reason = (
                    "No recent customer activity"
                )

            elif days_since_order > 45:

                risk = "Medium"

                reason = (
                    "Customer activity is slowing"
                )

            else:

                risk = "Low"

                reason = (
                    "Recent customer activity"
                )

            result.append({

                "customer_id":
                    customer["customer_id"],

                "customer_name":
                    customer["customer_name"].strip(),

                "email":
                    customer["email"],

                "city":
                    customer["city"],

                "customer_status":
                    customer["customer_status"],

                "completed_orders":
                    completed_orders,

                "total_spent":
                    total_spent,

                "last_order_date":
                    (
                        str(last_order)
                        if last_order
                        else None
                    ),

                "days_since_order":
                    days_since_order,

                "risk":
                    risk,

                "reason":
                    reason
            })

        cursor.close()
        conn.close()

        # ----------------------------------------------------
        # Summary
        # ----------------------------------------------------

        high = sum(
            1 for customer in result
            if customer["risk"] == "High"
        )

        medium = sum(
            1 for customer in result
            if customer["risk"] == "Medium"
        )

        low = sum(
            1 for customer in result
            if customer["risk"] == "Low"
        )

        return {

            "success": True,

            "summary": {

                "high": high,

                "medium": medium,

                "low": low,

                "total": len(result)
            },

            "reference_date":
                str(reference_date),

            "customers": result
        }

    except Exception as e:

        return {

            "success": False,

            "message":
                "Churn risk calculation failed.",

            "error":
                str(e)
        }


# ============================================================
# CSV UPLOAD
# ============================================================

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    try:

        # Check extension
        if not file.filename.lower().endswith(".csv"):

            return {
                "success": False,
                "message": "Please upload a CSV file."
            }

        contents = await file.read()

        if not contents:

            return {
                "success": False,
                "message": "Uploaded file is empty."
            }

        # Read CSV
        df = pd.read_csv(
            io.BytesIO(contents)
        )

        if df.empty:

            return {
                "success": False,
                "message": "CSV contains no data."
            }

        # ----------------------------------------------------
        # Normalize column names
        # ----------------------------------------------------

        df.columns = [
            str(column)
            .strip()
            .lower()
            .replace(" ", "_")
            for column in df.columns
        ]

        # ----------------------------------------------------
        # Required customer columns
        # ----------------------------------------------------

        required_columns = [
            "first_name",
            "email"
        ]

        missing_columns = [
            column
            for column in required_columns
            if column not in df.columns
        ]

        if missing_columns:

            return {

                "success": False,

                "message":
                    "Required columns are missing.",

                "missing_columns":
                    missing_columns
            }

        conn = get_connection()

        cursor = conn.cursor()

        inserted = 0
        updated = 0

        # ----------------------------------------------------
        # Insert / update customers
        # ----------------------------------------------------

        for _, row in df.iterrows():

            first_name = str(
                row.get("first_name", "")
            ).strip()

            if not first_name:
                continue

            last_name = row.get(
                "last_name",
                None
            )

            email = str(
                row.get("email", "")
            ).strip()

            gender = row.get(
                "gender",
                None
            )

            age = row.get(
                "age",
                None
            )

            city = row.get(
                "city",
                None
            )

            country = row.get(
                "country",
                "India"
            )

            signup_date = row.get(
                "signup_date",
                None
            )

            customer_status = row.get(
                "customer_status",
                "Active"
            )

            # Clean NaN values
            values = [
                last_name,
                gender,
                age,
                city,
                country,
                signup_date,
                customer_status
            ]

            cleaned_values = []

            for value in values:

                if pd.isna(value):
                    cleaned_values.append(None)

                else:
                    cleaned_values.append(value)

            (
                last_name,
                gender,
                age,
                city,
                country,
                signup_date,
                customer_status
            ) = cleaned_values

            # ------------------------------------------------
            # Existing customer?
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT customer_id
                FROM customers
                WHERE email = %s
                """,
                (email,)
            )

            existing = cursor.fetchone()

            if existing:

                cursor.execute(
                    """
                    UPDATE customers
                    SET
                        first_name = %s,
                        last_name = %s,
                        gender = %s,
                        age = %s,
                        city = %s,
                        country = %s,
                        signup_date = %s,
                        customer_status = %s
                    WHERE email = %s
                    """,
                    (
                        first_name,
                        last_name,
                        gender,
                        age,
                        city,
                        country,
                        signup_date,
                        customer_status,
                        email
                    )
                )

                updated += 1

            else:

                cursor.execute(
                    """
                    INSERT INTO customers
                    (
                        first_name,
                        last_name,
                        email,
                        gender,
                        age,
                        city,
                        country,
                        signup_date,
                        customer_status
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    """,
                    (
                        first_name,
                        last_name,
                        email,
                        gender,
                        age,
                        city,
                        country,
                        signup_date,
                        customer_status
                    )
                )

                inserted += 1

        conn.commit()

        cursor.close()
        conn.close()

        return {

            "success": True,

            "message":
                "CSV imported successfully.",

            "filename":
                file.filename,

            "rows_received":
                len(df),

            "inserted":
                inserted,

            "updated":
                updated
        }

    except Exception as e:

        return {

            "success": False,

            "message":
                "CSV import failed.",

            "error":
                str(e)
        }