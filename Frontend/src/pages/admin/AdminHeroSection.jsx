import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  Sparkles, Image as ImageIcon, CheckCircle, Upload, Globe, Copy, Check,
  Eye, RefreshCw, AlertCircle, Plus, Edit2, Trash2, Power, Layers
} from "lucide-react";

export default function AdminHeroSection() {
  const [banners, setBanners] = useState([]);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [copied, setCopied] = useState(false);

  // Form state
  const initialForm = {
    badge_text: "MANGO SEASON SPECIAL",
    title: "Dashheri & Langra have arrived",
    description: "Bring home naturally sweet fruits and pesticide-free vegetables, sorted fresh and delivered with care.",
    button_text: "Shop Now",
    button_link: "/products",
    order: 0,
    is_active: true
  };

  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const backendBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${backendBaseUrl}${clean}`;
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hero-section/all");
      const list = res.data?.banners || [];
      setBanners(list);

      // Default select the first active banner or first banner
      if (list.length > 0) {
        const active = list.find(b => b.is_active) || list[0];
        if (!selectedBannerId) {
          selectBannerForPreview(active);
        } else {
          const current = list.find(b => b.id === selectedBannerId);
          if (current) selectBannerForPreview(current);
          else selectBannerForPreview(active);
        }
      } else {
        // No banner yet
        setForm(initialForm);
        setImagePreview("");
      }
    } catch (err) {
      console.error("Failed to fetch banners:", err);
      setMsg({ type: "error", text: "Failed to load hero banners from server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const selectBannerForPreview = (b) => {
    setSelectedBannerId(b.id);
    setImagePreview(b.image_full_url || getFullImageUrl(b.image_url));
    setImageFile(null);
  };

  const handleStartCreateNew = () => {
    setIsEditing(false);
    setSelectedBannerId(null);
    setForm({
      badge_text: "SEASON SPECIAL",
      title: "Fresh Seasonal Fruits & Veggies",
      description: "Hand-picked organic produce delivered fresh to your doorstep every morning.",
      button_text: "Order Now",
      button_link: "/products",
      order: banners.length,
      is_active: true
    });
    setImageFile(null);
    setImagePreview("");
    setMsg({ type: "", text: "" });
  };

  const handleStartEdit = (b) => {
    setIsEditing(true);
    setSelectedBannerId(b.id);
    setForm({
      badge_text: b.badge_text || "",
      title: b.title || "",
      description: b.description || "",
      button_text: b.button_text || "",
      button_link: b.button_link || "",
      order: b.order || 0,
      is_active: b.is_active ?? true
    });
    setImageFile(null);
    setImagePreview(b.image_full_url || getFullImageUrl(b.image_url));
    setMsg({ type: "", text: "" });

    // Scroll smoothly to edit form
    document.getElementById("hero-form-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("badge_text", form.badge_text);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("button_text", form.button_text);
      formData.append("button_link", form.button_link);
      formData.append("order", form.order);
      formData.append("is_active", form.is_active);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      let res;
      if (isEditing && selectedBannerId) {
        // Update existing banner
        res = await api.put(`/hero-section/${selectedBannerId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        // Create brand NEW banner
        res = await api.post("/hero-section", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      if (res.data?.success) {
        setMsg({
          type: "success",
          text: isEditing
            ? "✅ Hero banner updated successfully!"
            : "✅ New hero banner created successfully!"
        });
        setImageFile(null);
        await fetchBanners();
        if (!isEditing && res.data.hero?.id) {
          setIsEditing(true);
          setSelectedBannerId(res.data.hero.id);
        }
      } else {
        setMsg({ type: "error", text: res.data?.message || "Failed to save hero banner." });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.response?.data?.message || "Error saving hero banner." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/hero-section/${id}/status`);
      if (res.data?.success) {
        await fetchBanners();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (id, title, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete banner "${title || id}"?`)) return;

    try {
      const res = await api.delete(`/hero-section/${id}`);
      if (res.data?.success) {
        setMsg({ type: "success", text: "Hero banner deleted successfully." });
        if (selectedBannerId === id) {
          setSelectedBannerId(null);
          setIsEditing(false);
        }
        await fetchBanners();
      }
    } catch (err) {
      console.error("Failed to delete banner:", err);
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to delete banner." });
    }
  };

  const copyNextJsCode = () => {
    const code = `// Next.js Frontend Hero Component Example:
// GET /api/hero-section (No authentication required)
// Returns { hero: {...}, banners: [...] }

export default async function HeroSection() {
  const res = await fetch("${backendBaseUrl || 'http://localhost:3000'}/api/hero-section", {
    next: { revalidate: 60 } // Real-time caching (60s)
  });
  const data = await res.json();
  const hero = data?.hero; // Active primary banner
  const allBanners = data?.banners || []; // All active banners (for carousel/slider)

  return (
    <section className="relative overflow-hidden bg-white py-12 px-6 lg:px-16 flex flex-col md:flex-row items-center justify-between">
      <div className="max-w-xl z-10">
        {hero?.badge_text && (
          <span className="inline-block bg-[#f5b335] text-white text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider mb-4 shadow-sm">
            {hero.badge_text}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-black text-[#15803d] leading-tight mb-4 whitespace-pre-line">
          {hero?.title}
        </h1>
        <p className="text-gray-600 text-base md:text-lg mb-6 leading-relaxed">
          {hero?.description}
        </p>
        {hero?.button_text && (
          <a
            href={hero?.button_link || "/products"}
            className="inline-block bg-[#15803d] hover:bg-[#166534] text-white font-bold px-7 py-3 rounded-xl shadow-md transition"
          >
            {hero.button_text}
          </a>
        )}
      </div>

      <div className="mt-8 md:mt-0 max-w-md w-full flex justify-center">
        {hero?.image_full_url && (
          <img
            src={hero.image_full_url}
            alt={hero.title || "Hero Banner"}
            className="w-full h-auto object-contain max-h-[380px]"
          />
        )}
      </div>
    </section>
  );
}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Loading Hero Banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Website Hero Banners <Sparkles className="text-amber-500" size={24} />
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create multiple hero banners for your Next.js website (supports sliders, carousels, or single active banner).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* <button
            onClick={handleStartCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus size={18} /> Add New Banner
          </button> */}

          <button
            onClick={fetchBanners}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl shadow-xs transition-all"
            title="Refresh banner list"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {msg.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
            }`}
        >
          {msg.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 2. LIVE REAL-TIME VISUAL PREVIEW */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="text-green-600" size={18} />
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
              Live Next.js Preview {selectedBannerId ? `(Banner #${selectedBannerId})` : "(New Banner Preview)"}
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800">
            Real-Time Visual Mockup
          </span>
        </div>

        <div className="p-6 md:p-12 bg-linear-to-r from-gray-50 via-white to-gray-50/60 flex flex-col md:flex-row items-center justify-between gap-8 min-h-[300px] relative overflow-hidden">
          <div className="max-w-xl space-y-4 z-10">
            <div>
              <span className="inline-block bg-[#f5b335] text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-2xs">
                {form.badge_text || "MANGO SEASON SPECIAL"}
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-[#15803d] tracking-tight leading-tight whitespace-pre-line">
              {form.title || "Dashheri & Langra\nhave arrived"}
            </h2>

            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-lg">
              {form.description || "Bring home naturally sweet fruits and pesticide-free vegetables, sorted fresh and delivered with care."}
            </p>

            {/* {form.button_text && (
              <div className="pt-2">
                <span className="inline-block bg-[#15803d] text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm">
                  {form.button_text}
                </span>
              </div>
            )} */}

          </div>

          <div className="w-full md:w-1/2 flex justify-center items-center z-10">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={form.title || "Hero Image"}
                className="max-h-[250px] md:max-h-[300px] w-auto object-contain transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="w-64 h-52  rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
                {/* border-2 border-dashed border-gray-300 */}
                {/* <ImageIcon size={44} className="text-gray-300" /> */}

                <img
                  src={imagePreview || "https://t3.ftcdn.net/jpg/09/14/85/12/360_F_914851224_gB4MqXYCua2569jkqHAp3KDCqVZtYUME.jpg"}
                  alt={form.title || "Hero Image"}
                  className="max-h-[300px] md:max-h-[300px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                />

                {/* <span className="text-xs font-medium">Select an image to preview</span> */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MULTIPLE BANNERS LIST */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-600" size={20} />
            <h2 className="font-bold text-gray-900 text-base">
              All Hero Banners ({banners.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Click <strong>Edit</strong> on any banner to modify it or click <strong>+ Add New Banner</strong> to create another slide.
          </span>
        </div>

        {banners.length === 0 ? (
          <div className="p-8 text-center text-gray-400 italic bg-gray-50 rounded-xl">
            No banners created yet. Click "+ Add New Banner" to create your first hero banner.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((b) => {
              const isSelected = selectedBannerId === b.id && isEditing;
              const imgUrl = b.image_full_url || getFullImageUrl(b.image_url);

              return (
                <div
                  key={b.id}
                  onClick={() => selectBannerForPreview(b)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative flex flex-col justify-between ${isSelected
                    ? "border-green-600 ring-2 ring-green-500/20 bg-green-50/20 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                >
                  <div>
                    {/* Header: Tag + Active Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 truncate max-w-[180px]">
                        {b.badge_text || "NO TAG"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(b.id, e)}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition flex items-center gap-1 ${b.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        title="Click to toggle Active/Inactive"
                      >
                        <Power size={12} />
                        {b.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {/* Image & Title */}
                    <div className="flex gap-3 items-center my-2">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={b.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-gray-300" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-sm text-gray-900 truncate" title={b.title}>
                          {b.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {b.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400 font-mono">Order: #{b.order || 0}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(b)}
                        className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg flex items-center gap-1 transition"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(b.id, b.title, e)}
                        className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Delete banner"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. EDIT OR CREATE FORM */}
      <div id="hero-form-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? `Edit Banner #${selectedBannerId}` : "Create New Hero Banner"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditing
                  ? "Update this banner's text, image, or order."
                  : "Fill in the details to add a new banner to the website."}
              </p>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={handleStartCreateNew}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                + Cancel & Create New
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text 1: Badge Text */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Text 1: Badge / Tag Text <span className="text-amber-500 font-normal">(Top Yellow Pill)</span>
              </label>
              <input
                type="text"
                value={form.badge_text}
                onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                placeholder="e.g. MANGO SEASON SPECIAL"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-medium text-gray-900"
                required
              />
            </div>

            {/* Text 2: Main Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Text 2: Main Heading / Title <span className="text-green-600 font-normal">(Large Green Headline)</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Dashheri & Langra have arrived"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-bold text-gray-900"
                required
              />
            </div>

            {/* Text 3: Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Text 3: Subtitle / Description Text
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Bring home naturally sweet fruits and pesticide-free vegetables, sorted fresh and delivered with care."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-700"
                required
              />
            </div>

            {/* Hero Image */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Hero Image <span className="text-gray-400 font-normal">(PNG, JPG, WebP)</span>
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition">
                  <Upload size={18} className="text-green-600" />
                  <span>{imagePreview ? "Change Image File" : "Choose Image File"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <span className="text-xs text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    Selected: {imageFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Additional Settings: Order & Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                  title="Smaller numbers appear first"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <label htmlFor="is_active_toggle" className="text-sm font-semibold text-gray-800 cursor-pointer">
                  Active (Show on website)
                </label>
              </div>
            </div>

            {/* Button text & link */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Button Text (Optional)</label>
                <input
                  type="text"
                  value={form.button_text}
                  onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                  placeholder="e.g. Shop Now"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Button Link (Optional)</label>
                <input
                  type="text"
                  value={form.button_link}
                  onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                  placeholder="e.g. /products"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>
            </div> */}

            {/* Submit */}
            <div className="pt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>{isEditing ? "Update Hero Banner" : "Create & Add Banner"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Developer Guide / API Info Card */}
        {/* <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="text-blue-600" size={20} />
              <h3 className="font-bold text-gray-900 text-base">Next.js API Integration</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Give this public endpoint to your Next.js developer. It returns both <code>hero</code> (primary active banner) and <code>banners</code> (array of all active banners for slider/carousel).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Endpoint URL (GET)</label>
                <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 mt-1 break-all select-all">
                  <span>{backendBaseUrl || 'http://localhost:3000'}/api/hero-section</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Response Data Keys</label>
                <ul className="text-xs text-gray-600 mt-1 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono">
                  <li>• <span className="text-emerald-700 font-bold">banners</span>: Array of all active banners</li>
                  <li>• <span className="text-blue-700 font-bold">hero</span>: Current top active banner</li>
                  <li>• <span className="text-amber-600 font-semibold">badge_text</span></li>
                  <li>• <span className="text-green-700 font-semibold">title</span></li>
                  <li>• <span className="text-blue-700 font-semibold">description</span></li>
                  <li>• <span className="text-purple-700 font-semibold">image_full_url</span></li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={copyNextJsCode}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  <span>{copied ? "Copied Next.js Snippet!" : "Copy Next.js Code Snippet"}</span>
                </button>
              </div>
            </div>
          </div>
        </div> */}

      </div>
    </div>
  );
}
