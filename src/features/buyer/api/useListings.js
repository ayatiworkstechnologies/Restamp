/**
 * useListings hook: paginated GET /buyer/listings bound to UI filter state.
 * Honest data rules (P0): real API results are preserved as-is; a failed
 * request surfaces through `error` (never mock substitution); a successful
 * empty page stays empty. Failure and empty are never confused.
 * Returns { items, total, page, loading, loadingMore, error, loadMore, refresh }.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../../../shared/api/client.js";
import { buildListingParams, toUiProperty } from "../../../shared/api/mappers.js";

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
        // Honest failure: surface the error, never substitute mock data.
        // A failed first page clears to empty (failure is not an empty
        // result — `error` distinguishes them); an append failure keeps the
        // already-loaded items so successfully fetched data is preserved.
        setError(e);
        if (!append) {
          setItems([]);
          setTotal(0);
          setPage(pageToLoad);
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
