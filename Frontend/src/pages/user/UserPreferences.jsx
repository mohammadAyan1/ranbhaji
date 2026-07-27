import { useState, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import api from "../../api/axios";

export default function UserPreferences() {
  const { user, fetchMe } = useAuthStore();
  const [vegetables, setVegetables] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user?.disliked_products) {
      setDisliked(user.disliked_products);
    }
  }, [user]);

  useEffect(() => {
    api.get("/products/public/vegetables")
      .then(res => setVegetables(res.data.products || []))
      .catch(console.error);
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

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vegetables</h2>
        {vegetables.length === 0 ? (
          <p className="text-gray-500 text-sm">Loading vegetables...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {vegetables.map(veg => (
              <label 
                key={veg.id} 
                className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  disliked.includes(veg.id) 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-200 hover:border-fresh-400 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-red-500 focus:ring-red-500 w-5 h-5"
                  checked={disliked.includes(veg.id)}
                  onChange={() => handleCheckboxChange(veg.id)}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{veg.name}</span>
                  <span className="text-xs text-gray-500">{veg.hindi_name}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
