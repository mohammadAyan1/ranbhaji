import { useState, useEffect, useMemo } from "react";
import { Search, X, Check, Ban, RotateCcw, Filter } from "lucide-react";
import useAuthStore from "../../store/authStore";
import api from "../../api/axios";

export default function UserPreferences() {
  const { user, fetchMe } = useAuthStore();
  const [vegetables, setVegetables] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVegetables, setLoadingVegetables] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'disliked' | 'allowed'

  useEffect(() => {
    if (user?.disliked_products) {
      setDisliked(user.disliked_products);
    }
  }, [user]);

  useEffect(() => {
    setLoadingVegetables(true);
    api.get("/products/public/vegetables")
      .then(res => setVegetables(res.data.products || []))
      .catch(console.error)
      .finally(() => setLoadingVegetables(false));
  }, []);

  const handleCheckboxChange = (id) => {
    setDisliked(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/auth/me/dislikes", { disliked_products: disliked });
      setMessage({ type: "success", text: "Preferences updated successfully!" });
      await fetchMe();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to update preferences." });
    } finally {
      setIsLoading(false);
    }
  };

  // Derive unique subcategories from vegetables
  const subCategories = useMemo(() => {
    const list = Array.from(
      new Set(vegetables.map(v => (v.sub_category || "").trim()).filter(Boolean))
    );
    return ["all", ...list];
  }, [vegetables]);

  // Filter logic
  const filteredVegetables = useMemo(() => {
    return vegetables.filter(veg => {
      // 1. Search Query (name or hindi_name)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (veg.name || "").toLowerCase().includes(q);
        const matchHindi = (veg.hindi_name || "").toLowerCase().includes(q);
        if (!matchName && !matchHindi) return false;
      }

      // 2. Sub-Category
      if (selectedSubCategory !== "all") {
        const sub = (veg.sub_category || "").trim().toLowerCase();
        if (sub !== selectedSubCategory.trim().toLowerCase()) return false;
      }

      // 3. Status Filter (disliked vs allowed)
      const isDisliked = disliked.includes(veg.id);
      if (statusFilter === "disliked" && !isDisliked) return false;
      if (statusFilter === "allowed" && isDisliked) return false;

      return true;
    });
  }, [vegetables, searchQuery, selectedSubCategory, statusFilter, disliked]);

  const dislikedCount = disliked.length;
  const allowedCount = Math.max(0, vegetables.length - dislikedCount);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSubCategory("all");
    setStatusFilter("all");
  };

  const isFilterActive = searchQuery.trim() !== "" || selectedSubCategory !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Preferences</h1>
          <p className="text-gray-600 mt-1">Select vegetables you do NOT want to receive in your auto-assigned deliveries.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isLoading} 
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isLoading ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="card space-y-4">
        {/* Header & Status Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vegetables Selection</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing {filteredVegetables.length} of {vegetables.length} vegetables
              {dislikedCount > 0 && (
                <span className="text-red-600 font-semibold ml-1.5">• {dislikedCount} excluded</span>
              )}
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold w-fit">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all" ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All ({vegetables.length})
            </button>
            <button
              onClick={() => setStatusFilter("disliked")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "disliked" ? "bg-red-500 text-white shadow-2xs font-bold" : "text-gray-600 hover:text-red-600"
              }`}
            >
              <Ban size={13} />
              Excluded ({dislikedCount})
            </button>
            <button
              onClick={() => setStatusFilter("allowed")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "allowed" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "text-gray-600 hover:text-emerald-600"
              }`}
            >
              <Check size={13} />
              Allowed ({allowedCount})
            </button>
          </div>
        </div>

        {/* Search Bar & Reset Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search vegetable by English or Hindi name (e.g. Potato, आलू, Lauki)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-fresh-500/30 focus:border-fresh-500 outline-none transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Reset Filters button */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all shrink-0"
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Sub-category Pills (if more than 1 subcategory exists) */}
        {subCategories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <span className="text-xs text-gray-400 font-medium shrink-0 mr-1 flex items-center gap-1">
              <Filter size={12} />
              Type:
            </span>
            {subCategories.map(sub => {
              const isSelected = selectedSubCategory.toLowerCase() === sub.toLowerCase();
              const label = sub === "all" ? "All Types" : sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                    isSelected
                      ? "bg-fresh-600 text-white shadow-2xs font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Vegetables Grid */}
        {loadingVegetables ? (
          <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-fresh-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading vegetables...</p>
          </div>
        ) : filteredVegetables.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-base font-semibold text-gray-700">No vegetables match your filter</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing your search query or switching filters.</p>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-4 py-2 text-xs font-semibold text-fresh-700 bg-fresh-50 border border-fresh-200 rounded-xl hover:bg-fresh-100 transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
            {filteredVegetables.map(veg => {
              const isDisliked = disliked.includes(veg.id);
              return (
                <label
                  key={veg.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                    isDisliked
                      ? "border-red-300 bg-red-50/70 shadow-2xs hover:bg-red-50"
                      : "border-gray-200 bg-white hover:border-fresh-400 hover:bg-gray-50/60 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-5 h-5 cursor-pointer shrink-0"
                      checked={isDisliked}
                      onChange={() => handleCheckboxChange(veg.id)}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 text-sm truncate">{veg.name}</span>
                      <span className="text-xs text-gray-500 truncate">{veg.hindi_name || "—"}</span>
                      {veg.sub_category && (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5 truncate">
                          {veg.sub_category}
                        </span>
                      )}
                    </div>
                  </div>
                  {isDisliked ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded-full shrink-0">
                      Excluded
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
