import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase/firebase";

const Reports = () => {
  const [moneyData, setMoneyData] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubMoney = onSnapshot(
      collection(db, "money_donations"),
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() ?? null,
          amount: Number(doc.data().amount || 0),
        }));
        setMoneyData(docs);
      },
      (error) => console.error("Money donations error:", error),
    );

    const unsubItems = onSnapshot(
      collection(db, "donations"),
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() ?? null,
        }));
        setItemData(docs);
      },
      (error) => console.error("Items donations error:", error),
    );

    setLoading(false);

    return () => {
      unsubMoney();
      unsubItems();
    };
  }, []);

  const COLORS = ["#3683F0", "#8B56EC", "#F59E0B", "#10B981", "#EF4444"];

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const monthlyData = useMemo(() => {
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthTotals = new Map();

    moneyData.forEach((entry) => {
      if (!entry.createdAt || Number.isNaN(entry.createdAt.getTime())) return;
      const month = entry.createdAt.toLocaleString("en-US", { month: "short" });
      monthTotals.set(
        month,
        (monthTotals.get(month) || 0) + (entry.amount || 0),
      );
    });

    return monthLabels.map((month) => ({
      month,
      donations: monthTotals.get(month) || 0,
    }));
  }, [moneyData]);

  const categoryData = useMemo(() => {
    const categoryTotals = new Map();

    itemData.forEach((entry) => {
      const category = entry.category || "Other";
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + 1);
    });

    return Array.from(categoryTotals.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [itemData]);

  const summaryCards = useMemo(() => {
    const totalMoney = moneyData.reduce(
      (sum, entry) => sum + (entry.amount || 0),
      0,
    );
    const totalItems = itemData.length;
    const delivered = itemData.filter(
      (entry) => String(entry.status || "").toLowerCase() === "delivered",
    ).length;
    const donors = new Set(
      moneyData
        .map((entry) => entry.donorId || entry.email || entry.id)
        .filter(Boolean),
    ).size;

    return [
      {
        label: "Total Raised",
        value: formatCurrency(totalMoney),
        icon: "fa-solid fa-indian-rupee-sign",
      },
      {
        label: "Donor Count",
        value: donors,
        icon: "fa-solid fa-users",
      },
      {
        label: "Item Donations",
        value: totalItems,
        icon: "fa-solid fa-box-open",
      },
      {
        label: "Delivered",
        value: delivered,
        icon: "fa-solid fa-check-circle",
      },
    ];
  }, [moneyData, itemData]);

  const recentRecords = useMemo(() => {
    const allRecords = [
      ...moneyData.map((entry) => ({
        type: "Money",
        name: entry.donorName || entry.name || "Anonymous Donor",
        detail: formatCurrency(entry.amount),
        date: entry.createdAt,
        status: entry.status || "Pending",
      })),
      ...itemData.map((entry) => ({
        type: "Items",
        name: entry.donorName || entry.name || "Anonymous Donor",
        detail: entry.category || "General",
        date: entry.createdAt,
        status: entry.status || "Pending",
      })),
    ];

    return allRecords
      .sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0))
      .slice(0, 6);
  }, [moneyData, itemData]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
      />

      <div style={styles.mainContent}>
        <div style={styles.container}>
          <div style={styles.headerRow}>
            <div>
              <p style={styles.eyebrow}>Overview</p>
              <h1 style={styles.heading}>Donation Reports</h1>
            </div>
            <span style={styles.liveBadge}>
              <i className="fa-solid fa-circle" style={{ fontSize: 10 }}></i>
              Live Firebase data
            </span>
          </div>

          {loading ? (
            <div style={styles.loader}>Loading report data...</div>
          ) : (
            <>
              <div style={styles.summaryGrid}>
                {summaryCards.map((card) => (
                  <div key={card.label} style={styles.summaryCard}>
                    <div style={styles.summaryIcon}>
                      <i className={card.icon}></i>
                    </div>
                    <div>
                      <p style={styles.summaryLabel}>{card.label}</p>
                      <h3 style={styles.summaryValue}>{card.value}</h3>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.chartGrid}>
                <div style={styles.chartContainer}>
                  <h2 style={styles.chartTitle}>Monthly Donations</h2>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `₹${value}`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="donations"
                        stroke="#3683F0"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Monthly Donations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={styles.chartContainer}>
                  <h2 style={styles.chartTitle}>Donation Categories</h2>
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} donations`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.tableCard}>
                <div style={styles.tableHeaderRow}>
                  <h2 style={styles.chartTitle}>Recent Activity</h2>
                </div>
                <div style={styles.tableResponsive}>
                  <table style={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableTh}>Type</th>
                        <th style={styles.tableTh}>Donor</th>
                        <th style={styles.tableTh}>Details</th>
                        <th style={styles.tableTh}>Date</th>
                        <th style={styles.tableTh}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRecords.map((record, index) => (
                        <tr key={`${record.type}-${record.name}-${index}`}>
                          <td style={styles.tableTd}>{record.type}</td>
                          <td style={styles.tableTd}>{record.name}</td>
                          <td style={styles.tableTd}>{record.detail}</td>
                          <td style={styles.tableTd}>
                            {record.date
                              ? record.date.toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td style={styles.tableTd}>
                            <span style={styles.statusPill}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  mainContent: {
    padding: "32px 24px 40px",
    backgroundColor: "#F8FAFC",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#FFF",
    padding: "28px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    boxSizing: "border-box",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#8B56EC",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  heading: {
    margin: 0,
    color: "#0F172A",
    fontSize: "28px",
    fontWeight: 700,
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#16A34A",
    background: "#ECFDF3",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
  },
  loader: {
    padding: "40px 0",
    textAlign: "center",
    color: "#64748B",
    fontSize: "14px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px",
    background: "#F8FAFC",
    borderRadius: "14px",
    border: "1px solid #E2E8F0",
  },
  summaryIcon: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #E0E7FF, #C7D2FE)",
    color: "#4338CA",
    borderRadius: "12px",
    fontSize: "18px",
  },
  summaryLabel: {
    margin: 0,
    color: "#64748B",
    fontSize: "13px",
  },
  summaryValue: {
    margin: "4px 0 0",
    color: "#0F172A",
    fontSize: "22px",
    fontWeight: 700,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  chartContainer: {
    padding: "20px",
    backgroundColor: "#FAFAFA",
    borderRadius: "14px",
    boxShadow: "inset 0 0 0 1px #EEF2F7",
  },
  chartTitle: {
    color: "#0F172A",
    fontSize: "18px",
    margin: "0 0 16px",
    fontWeight: 700,
  },
  tableCard: {
    marginTop: "18px",
    padding: "18px",
    background: "#FAFAFA",
    borderRadius: "14px",
  },
  tableHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },
  tableTh: {
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 700,
    color: "#64748B",
    padding: "12px 10px",
    borderBottom: "1px solid #E2E8F0",
  },
  tableTd: {
    padding: "12px 10px",
    color: "#334155",
    fontSize: "13px",
    borderBottom: "1px solid #EEF2F7",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    background: "#EFF6FF",
    color: "#1D4ED8",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },
};

export default Reports;
