"use client";

import { useState, useEffect, useCallback } from "react";

interface InventoryItem {
  "Item Name": string;
  color: string;
  size: string;
  length: string;
  "Total Stock": string;
}

interface ApiResponse {
  data: InventoryItem[];
  headers: string[];
  error?: string;
}

export default function Home() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInventory = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    }
    try {
      const response = await fetch("/api/inventory");
      const result: ApiResponse = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setInventory(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredInventory = inventory.filter((item: InventoryItem) => {
    const search = searchTerm.toLowerCase();
    return (
      item["Item Name"]?.toLowerCase().includes(search) ||
      item.color?.toLowerCase().includes(search) ||
      item.size?.toLowerCase().includes(search) ||
      item.length?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>📦 Stock Tracker</h1>
        </div>
        <div className="error">
          <p>⚠️ {error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchInventory();
            }}
            style={{
              marginTop: "12px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#dc2626",
              color: "white",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📦 Stock Tracker</h1>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredInventory.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <p>No items found</p>
        </div>
      ) : (
        <div className="inventory-list">
          {filteredInventory.map((item, index) => (
            <div key={index} className="inventory-card">
              <div className="item-header">
                <div className="item-name">{item["Item Name"] || "Unnamed Item"}</div>
              </div>
              <div className="item-details">
                <div className="detail-item">
                  <div className="detail-label">Color</div>
                  <div className="detail-value">{item.color || "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Size</div>
                  <div className="detail-value">{item.size || "-"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Length</div>
                  <div className="detail-value">{item.length || "-"}</div>
                </div>
                <div className="detail-item highlight">
                  <div className="detail-label">Available</div>
                  <div className="detail-value">{item["Total Stock"] || "0"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
        onClick={() => fetchInventory(true)}
        disabled={isRefreshing}
        aria-label="Refresh inventory"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
      </button>
    </div>
  );
}
