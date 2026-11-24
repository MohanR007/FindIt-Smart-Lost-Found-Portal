import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  X, AlertCircle, CheckCircle, Loader2, ChevronDown, LogIn,
  UploadCloud, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { uploadItemImage } from '../services/api.js';
import { CATEGORIES, LOCATIONS } from '../data/mockData';

const TODAY_DATE = new Date().toISOString().split('T')[0];

export default function ReportPage() {
  const { currentUser, loginAsDemoUser } = useAuth();
  const { addItem } = useItems();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { type: pathType } = useParams();
  const fileInputRef = useRef(null);

  const initialType = pathType === 'found' || searchParams.get('type') === 'found' ? 'found' : 'lost';

  const [form, setForm] = useState({
    type: initialType,
    name: '',
    category: '',
    description: '',
    location: '',
    date: '',
    tags: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  // Clean up object URLs on unmount or when imagePreview changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#101D36]/10 flex items-center justify-center mx-auto mb-6 shadow-md">
          <LogIn className="w-8 h-8 text-[#101D36]" />
        </div>
        <span className="text-xs uppercase tracking-widest font-mono text-[#8999AE]">Authentication Required</span>
        <h2 className="font-serif text-3xl font-bold text-[#101D36] mt-2 mb-3">Sign in to File a Report</h2>
        <p className="text-sm text-[#8999AE] mb-8 leading-relaxed">
          You need an active FindIt identity to report lost belongings or register discovered property in the custody registry.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] transition shadow-xs cursor-pointer"
          >
            Go to Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              loginAsDemoUser('user');
            }}
            className="px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#101D36]/20 text-[#101D36] bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Quick Demo Sign In
          </button>
        </div>
      </div>
    );
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '', submit: '' });
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type and common image extensions
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!validMimes.includes(file.type?.toLowerCase()) && !validExts.includes(ext)) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file (PNG, JPG, or WEBP).' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image file size must be less than 5MB.' }));
      return;
    }

    // Revoke previous temporary object URL if present
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(objectUrl);
    setErrors((prev) => ({ ...prev, image: '', submit: '' }));
  }

  function handleDrop(e) {
    e.preventDefault();
    if (isSubmitting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleImageChange(fakeEvent);
    }
  }

  function clearImage() {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors((prev) => ({ ...prev, image: '' }));
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Item title is required.';
    if (!form.category) newErrors.category = 'Please select a catalog category.';
    if (!form.description.trim() || form.description.trim().length < 20) {
      newErrors.description = 'Detailed description must be at least 20 characters.';
    }
    if (!form.location) newErrors.location = 'Please specify the campus location.';
    if (!form.date) newErrors.date = 'Date of incident is required.';
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return; // Prevent concurrent submissions

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      let imageKey = null;

      // 1. Upload photograph to private S3 bucket FIRST (if attached)
      if (imageFile) {
        setUploadStatus('uploading_image');
        try {
          imageKey = await uploadItemImage(imageFile);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          setErrors((prev) => ({
            ...prev,
            submit: `Image upload failed: ${uploadErr.message || 'Could not upload photograph to storage.'}`,
          }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          setUploadStatus('');
          return; // Do NOT proceed to item creation if image upload fails
        }
      }

      // 2. Create DynamoDB item record SECOND using verified imageKey
      setUploadStatus('creating_item');

      const tags = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const itemPayload = {
        type: form.type,
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        location: form.location,
        date: form.date,
        tags,
        reportedBy: currentUser.id,
        reporterName: currentUser.name,
      };

      if (imageKey) {
        itemPayload.imageKey = imageKey;
      }

      const newItem = await addItem(itemPayload);
      setSubmittedId(newItem.id || newItem.itemId);
      setSuccess(true);
    } catch (err) {
      console.error('Failed to submit item report:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to submit report. Please check your connection and try again.',
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-200">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <span className="text-xs uppercase tracking-widest font-mono text-emerald-700">Report Indexed</span>
        <h2 className="font-serif text-3xl font-bold text-[#101D36] mt-2 mb-3">Report Cataloged Successfully</h2>
        <p className="text-sm text-[#8999AE] mb-8 leading-relaxed">
          Your <span className="font-semibold text-[#101D36]">{form.type.toUpperCase()}</span> listing has been registered in the campus custody network. The matching engine is scanning existing listings in real-time.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
              }
              navigate(`/items/${submittedId}`);
            }}
            className="px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#101D36] hover:bg-[#172944] transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>View Published Listing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setSuccess(false);
              setForm({ type: 'lost', name: '', category: '', description: '', location: '', date: '', tags: '' });
              clearImage();
            }}
            className="px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#101D36] border border-[#E5E7EB] bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Report Another Item
          </button>
        </div>
      </div>
    );
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 text-sm border rounded-xl bg-white text-[#101D36] placeholder-[#8999AE] focus:outline-none focus:ring-2 focus:ring-[#101D36]/20 transition ${
      errors[field] ? 'border-rose-400 bg-rose-50/20' : 'border-[#E5E7EB] focus:border-[#101D36]'
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8">
      {/* Editorial Header */}
      <div className="pb-6 border-b border-[#101D36]/10">
        <span className="text-xs uppercase tracking-widest font-mono text-[#8999AE]">Registry Protocol</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#101D36] mt-1">Report Property</h1>
        <p className="text-sm text-[#8999AE] mt-1.5 leading-relaxed">
          Accurate descriptions, exact campus timestamps, and physical markers accelerate resolution and power the automated matching engine.
        </p>
      </div>

      {errors.submit && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report type selector */}
        <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider font-mono font-semibold text-[#101D36]">
              Classification Type
            </label>
            <span className="text-[11px] font-mono text-[#8999AE]">Select primary status</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'lost' })}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                form.type === 'lost'
                  ? 'border-rose-300 bg-rose-50/50 text-rose-900 shadow-xs'
                  : 'border-[#E5E7EB] bg-white text-[#8999AE] hover:text-[#101D36]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase tracking-wider font-bold">Lost Property</span>
                <span className={`w-2.5 h-2.5 rounded-full ${form.type === 'lost' ? 'bg-rose-500' : 'bg-gray-300'}`} />
              </div>
              <p className="text-xs text-[#8999AE]">I lost an item on campus and need to find it.</p>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'found' })}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                form.type === 'found'
                  ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 shadow-xs'
                  : 'border-[#E5E7EB] bg-white text-[#8999AE] hover:text-[#101D36]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase tracking-wider font-bold">Found Property</span>
                <span className={`w-2.5 h-2.5 rounded-full ${form.type === 'found' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <p className="text-xs text-[#8999AE]">I discovered an item and wish to return it safely.</p>
            </button>
          </div>
        </div>

        {/* Item details */}
        <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-[#101D36]">Item Specification</h3>
            <span className="text-[11px] font-mono text-[#8999AE]">* Required fields</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Item Title / Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Space Gray MacBook Air M2, Brown Leather Bellroy Wallet, Ray-Ban Glasses"
              className={inputClass('name')}
            />
            {errors.name && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />{errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Category Registry *
            </label>
            <div className="relative">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`${inputClass('category')} appearance-none pr-10 cursor-pointer`}
              >
                <option value="">Select standard category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8999AE] pointer-events-none" />
            </div>
            {errors.category && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />{errors.category}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Public Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe visible characteristics: color, brand logo, condition, markings, exterior casing, or items inside. (Note: Keep unique private traits like lock screen passwords or serial numbers secret for the verification claim step)."
              className={`${inputClass('description')} resize-none`}
            />
            <div className="flex justify-between items-center mt-1.5 font-mono text-[11px]">
              {errors.description ? (
                <p className="text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.description}
                </p>
              ) : (
                <span className="text-[#8999AE]">Minimum 20 characters required</span>
              )}
              <span className="text-[#8999AE]">{form.description.length} chars</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
              Index Tags (Optional)
            </label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="e.g. apple, 13-inch, sticker on back, black pouch (comma separated)"
              className={inputClass('tags')}
            />
            <p className="text-[11px] text-[#8999AE] mt-1 font-mono">
              Tags are parsed directly by the heuristic matching algorithm.
            </p>
          </div>
        </div>

        {/* Location & Date */}
        <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-[#101D36]">Time &amp; Geography</h3>
            <span className="text-[11px] font-mono text-[#8999AE]">DSCE Campus</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                {form.type === 'lost' ? 'Last Known Location *' : 'Discovery Location *'}
              </label>
              <div className="relative">
                <select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className={`${inputClass('location')} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="">Select campus node...</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8999AE] pointer-events-none" />
              </div>
              {errors.location && (
                <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.location}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#101D36] mb-1.5">
                {form.type === 'lost' ? 'Date Lost *' : 'Date Discovered *'}
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                max={TODAY_DATE}
                className={inputClass('date')}
              />
              {errors.date && (
                <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.date}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Drag and Drop Image Upload Zone */}
        <div className="glass-card rounded-2xl border border-[#101D36]/10 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-[#101D36]">Photographic Evidence</h3>
            <span className="text-[11px] font-mono text-[#8999AE]">Optional but recommended</span>
          </div>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#101D36]/15 bg-[#101D36] shadow-sm">
              <img
                src={imagePreview}
                alt="Uploaded property preview"
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearImage}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-[#101D36]/90 backdrop-blur-md text-white hover:bg-rose-600 text-xs font-semibold flex items-center gap-1 transition shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                if (!isSubmitting) fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed border-[#E5E7EB] hover:border-[#101D36]/40 rounded-2xl p-8 text-center bg-white/50 hover:bg-white transition group ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[#DCE5EF]/60 text-[#101D36] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#101D36] mb-1">
                Drop your photograph here, or <span className="underline underline-offset-2">browse files</span>
              </p>
              <p className="text-xs text-[#8999AE] font-mono">PNG, JPG, or WEBP up to 5MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isSubmitting}
            onChange={handleImageChange}
            className="hidden"
          />
          {errors.image && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-mono">
              <AlertCircle className="w-3.5 h-3.5" />{errors.image}
            </p>
          )}

          <div className="p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] flex items-center gap-2.5 text-xs text-[#8999AE]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Photographs are audited for private identity details prior to public display.</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#F7F5EF] bg-[#101D36] hover:bg-[#172944] active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#DCE5EF]" />
              <span>
                {uploadStatus === 'uploading_image'
                  ? 'Uploading Photograph to Secure Storage...'
                  : 'Indexing Registry Record...'}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#DCE5EF]" />
              <span>Submit {form.type === 'lost' ? 'Lost Property' : 'Found Property'} Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
