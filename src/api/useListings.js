/**
 * useListings hook: paginated GET /buyer/listings bound to UI filter state.
 * Gracefully falls back to mock properties when the backend server is offline/unreachable.
 * Returns { items, total, page, loading, loadingMore, error, loadMore, refresh }.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "./client";
import { buildListingParams, toUiProperty } from "./mappers";
import ALL_PROPERTIES from "../data/properties";

function filterMockProperties(filters, pageToLoad, pageSize) {
  let result = [...ALL_PROPERTIES];

  // 1. Deal Tab (Buy / Rent / Lease)
  if (filters.dealTab) {
    const deal = String(filters.dealTab).toLowerCase();
    if (deal === "buy") {
      result = result.filter(
        (p) =>
          p.listingType === "Sale" ||
          p.badgeType === "sale" ||
          p.badgeType === "resale" ||
          p.transactionType === "BUY" ||
          (!p.price?.includes("/mo") && !p.price?.includes("/month"))
      );
    } else if (deal === "rent") {
      result = result.filter(
        (p) =>
          p.listingType === "Rent" ||
          p.badgeType === "rent" ||
          p.price?.includes("/mo") ||
          p.price?.includes("/month")
      );
    } else if (deal === "lease") {
      result = result.filter(
        (p) => p.listingType === "Lease" || p.badgeType === "lease"
      );
    }
  }

  // 2. Property Type
  if (filters.selectedType && filters.selectedType !== "All Types") {
    const targetType = String(filters.selectedType).toLowerCase();
    result = result.filter(
      (p) =>
        (p.type || "").toLowerCase() === targetType ||
        (targetType === "house" && (p.type || "").toLowerCase() === "home")
    );
  }

  // 3. Search query or locality
  const query = (filters.searchQuery || filters.locality || "").trim().toLowerCase();
  if (query) {
    result = result.filter((p) => {
      const loc = (p.location || "").toLowerCase();
      const addr = (p.address || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return (
        loc.includes(query) ||
        addr.includes(query) ||
        title.includes(query) ||
        desc.includes(query)
      );
    });
  }

  // 4. BHK
  if (filters.bhk && filters.bhk !== "All BHK") {
    if (filters.bhk === "4+ BHK") {
      result = result.filter((p) => (p.beds || 0) >= 4);
    } else {
      const n = parseInt(filters.bhk, 10);
      if (!Number.isNaN(n)) {
        result = result.filter((p) => (p.beds || 0) === n);
      }
    }
  }

  // 5. Budget in Rupees
  const minR = Math.max(filters.presetMinRupees || 0, filters.minRupees || 0);
  const maxR = Math.min(
    filters.presetMaxRupees == null ? Infinity : filters.presetMaxRupees,
    filters.maxRupees == null ? Infinity : filters.maxRupees
  );
  if (minR > 0 || maxR < Infinity) {
    result = result.filter((p) => {
      const pVal = p.rawPrice || 0;
      if (pVal === 0) return true;
      return pVal >= minR && pVal <= maxR;
    });
  }

  // 6. Sort
  if (filters.sort === "price_asc") {
    result.sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0));
  } else if (filters.sort === "price_desc") {
    result.sort((a, b) => (b.rawPrice || 0) - (a.rawPrice || 0));
  } else if (filters.sort === "area_desc") {
    result.sort(
      (a, b) =>
        (parseInt(String(b.sqft || 0).replace(/,/g, ""), 10) || 0) -
        (parseInt(String(a.sqft || 0).replace(/,/g, ""), 10) || 0)
    );
  }

  const total = result.length;
  const start = (pageToLoad - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  return { items, total };
}

export function useListings(uiFilters, { pageSize = 20 } = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);
  const filtersKey = JSON.stringify({ ...uiFilters, pageSize });

  const fetchPage = useCallback(
    async (pageToLoad, append) => {
      const myReq = ++reqId.current;
      if (pageToLoad === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const parsedFilters = JSON.parse(filtersKey);
        const params = buildListingParams(parsedFilters, pageToLoad, pageSize);
        const data = await apiGet("/buyer/listings", params);
        if (reqId.current !== myReq) return; // stale response
        const mapped = (data.items || []).map(toUiProperty);
        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setTotal(typeof data.total === "number" ? data.total : mapped.length);
        setPage(pageToLoad);
      } catch (e) {
        if (reqId.current !== myReq) return;
        // Fallback to offline mock properties if backend is unreachable
        try {
          const parsedFilters = JSON.parse(filtersKey);
          const fallback = filterMockProperties(parsedFilters, pageToLoad, pageSize);
          setItems((prev) => (append ? [...prev, ...fallback.items] : fallback.items));
          setTotal(fallback.total);
          setPage(pageToLoad);
          setError(null); // Clear error since fallback succeeded
        } catch {
          setError(e);
        }
      } finally {
        if (reqId.current === myReq) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filtersKey, pageSize]
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && !error && items.length < total) {
      fetchPage(page + 1, true);
    }
  }, [loading, loadingMore, error, items.length, total, page, fetchPage]);

  const refresh = useCallback(() => fetchPage(1, false), [fetchPage]);

  return { items, total, page, loading, loadingMore, error, loadMore, refresh };
}
