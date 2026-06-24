import React, { useRef, useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_COLORS = {
  Food: "#e87c3e",
  Clothes: "#3683F0",
  Education: "#10b981",
  Healthcare: "#ef4444",
  "Daily Essentials": "#f59e0b",
  Furniture: "#8b5cf6",
  Electronics: "#06b6d4",
  Stationery: "#ec4899",
  Other: "#64748b",
};

const Home = () => {
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartInstance = useRef(null);
  const pieChartInstance = useRef(null);

  const [totalDonations, setTotalDonations] = useState(0);
  const [donorCount, setDonorCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [pendingEventCount, setPendingEventCount] = useState(0);
  const [monthlyTotals, setMonthlyTotals] = useState(Array(12).fill(0));
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(true);

  // Live Streams (Keep your existing working listeners)
  useEffect(() => {
    const db = getFirestore();
    return onSnapshot(collection(db, "money_donations"), (snap) => {
      let sum = 0;
      const byMonth = Array(12).fill(0);
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === "verified") {
          const amount = Number(data.amount) || 0;
          sum += amount;
          const created = data.createdAt?.toDate?.();
          if (created) byMonth[created.getMonth()] += amount;
        }
      });
      setTotalDonations(sum);
      setMonthlyTotals(byMonth);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const db = getFirestore();
    return onSnapshot(collection(db, "donations"), (snap) => {
      const byCategory = {};
      snap.forEach((d) => {
        const cat = d.data().category || "Other";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      setCategoryTotals(byCategory);
    });
  }, []);

  useEffect(() => {
    const db = getFirestore();
    return onSnapshot(collection(db, "donors"), (snap) => setDonorCount(snap.size));
  }, []);

  useEffect(() => {
    const db = getFirestore();
    return onSnapshot(collection(db, "volunteers"), (snap) => setVolunteerCount(snap.size));
  }, []);

  useEffect(() => {
    const db = getFirestore();
    return onSnapshot(collection(db, "event_requests"), (snap) => {
      let pending = 0;
      snap.forEach((d) => { if (d.data().status === "pending") pending += 1; });
      setPendingEventCount(pending);
    });
  }, []);

  // Chart Rendering
  useEffect(() => {
    if (!barChartRef.current) return;
    const barCtx = barChartRef.current.getContext("2d");
    if (barChartInstance.current) barChartInstance.current.destroy();

    barChartInstance.current = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: MONTH_LABELS,
        datasets: [{
          data: monthlyTotals,
          backgroundColor: "#3683F0",
          borderRadius: 6,
          maxBarThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { family: "'DM Sans', sans-serif" } } },
          x: { grid: { display: false }, ticks: { font: { family: "'DM Sans', sans-serif" } } }
        }
      }
    });
  }, [monthlyTotals]);

  useEffect(() => {
    if (!pieChartRef.current) return;
    const pieCtx = pieChartRef.current.getContext("2d");
    if (pieChartInstance.current) pieChartInstance.current.destroy();

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map((l) => CATEGORY_COLORS[l] || "#94a3b8");

    pieChartInstance.current = new Chart(pieCtx, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: labels.length ? colors : ["#e2e8f0"],
          borderWidth: 2,
          borderColor: "#ffffff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: { legend: { position: "right", labels: { font: { family: "'DM Sans', sans-serif", size: 12 } } } }
      }
    });
  }, [categoryTotals]);

  const stats = [
    { label: "VERIFIED DONATIONS", value: `₹${totalDonations.toLocaleString("en-IN")}`, icon: "fa-solid fa-sack-dollar", accent: "#10b981", sub: "Total verified collections" },
    { label: "REGISTERED DONORS", value: donorCount, icon: "fa-solid fa-hand-holding-heart", accent: "#3683F0", sub: "Active donor profiles" },
    { label: "VOLUNTEERS", value: volunteerCount, icon: "fa-solid fa-people-carry-box", accent: "#e87c3e", sub: "On-field logistic agents" },
    { label: "PENDING EVENTS", value: pendingEventCount, icon: "fa-solid fa-calendar-day", accent: "#f59e0b", sub: "Requires approval" },
  ];

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={styles.pageWrapper}>

        {/* Top Header */}
        <div style={styles.header}>
          <p style={styles.eyebrow}>ADMIN OVERVIEW</p>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Real-time monitoring hub for operations and resources.</p>
        </div>

        {/* 4-Column Balanced Grid Row */}
        <div style={styles.statGrid}>
          {stats.map((s) => (
            <div key={s.label} style={{ ...styles.statCard, borderLeft: `4px solid ${s.accent}` }}>
              <div style={{ ...styles.iconWrapper, backgroundColor: `${s.accent}15`, color: s.accent }}>
                <i className={s.icon}></i>
              </div>
              <div style={styles.statContent}>
                <p style={styles.statLabel}>{s.label}</p>
                <p style={styles.statValue}>{loading ? "—" : s.value}</p>
                <p style={styles.statSub}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-Side Charts Layout */}
        <div style={styles.chartGrid}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Monthly Donation Trend</h3>
            <p style={styles.chartCaption}>Verified cash transfers split across months</p>
            <div style={styles.canvasContainer}>
              <canvas ref={barChartRef}></canvas>
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Item Donations by Category</h3>
            <p style={styles.chartCaption}>Current supply inventory split breakdown</p>
            <div style={styles.canvasContainer}>
              <canvas ref={pieChartRef}></canvas>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

const styles = {
  pageWrapper: {
    width: "100%",
    padding: "40px",
    backgroundColor: "#F8FAFC", // Modern light background
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  },
  header: {
    marginBottom: "32px",
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748B",
    letterSpacing: "1px",
    margin: "0 0 4px 0",
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#0F172A",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#475569",
    margin: "4px 0 0 0",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
    marginBottom: "36px",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)",
  },
  iconWrapper: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  },
  statContent: {
    minWidth: 0,
  },
  statLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748B",
    margin: 0,
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0F172A",
    margin: "4px 0",
  },
  statSub: {
    fontSize: "12px",
    color: "#94A3B8",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr", // Gives the bar chart more room to display months cleanly
    gap: "24px",
    alignItems: "start",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)",
    border: "1px solid #E2E8F0",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0F172A",
    margin: 0,
  },
  chartCaption: {
    fontSize: "13px",
    color: "#64748B",
    margin: "4px 0 20px 0",
  },
  canvasContainer: {
    position: "relative",
    height: "300px",
    width: "100%",
  },
};

export default Home;
