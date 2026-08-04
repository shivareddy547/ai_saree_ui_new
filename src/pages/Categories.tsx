import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Edit2, Trash2, FolderPlus, ChevronDown, ChevronRight, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';
// ===== INTERFACES =====
interface Category {
  id?: string;
  name: string;
  subtitle?: string;
  highlightText?: string;
  description: string;
  image?: string | File;
  imageUrl?: string;
  bgGradient: string;
  badgeText?: string;
  badgeIcon?: string;
  order: number;
  isActive: boolean;
  parentId?: string | null;
  subCategories?: Category[];
  showInCategoryGrid?: boolean;
  showInHero?: boolean;
  permalink?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface CategoryFormData {
  name: string;
  subtitle: string;
  highlightText: string;
  description: string;
  image: string;
  imageFile: File | null;
  bgGradient: string;
  badgeText: string;
  badgeIcon: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
  showInCategoryGrid: boolean;
  showInHero: boolean;
  permalink: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}
// ===== COMPONENT: Categories =====
const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    subtitle: '',
    highlightText: '',
    description: '',
    image: '',
    imageFile: null,
    bgGradient: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    badgeText: '',
    badgeIcon: '',
    order: 0,
    isActive: true,
    parentId: null,
    showInCategoryGrid: true,
    showInHero: false,
    permalink: '',
    primaryButtonText: '',
    primaryButtonLink: '',
    secondaryButtonText: '',
    secondaryButtonLink: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Available gradient options
  const gradientOptions = [
    'bg-gradient-to-r from-purple-500 to-indigo-500',
    'bg-gradient-to-r from-pink-500 to-rose-500',
    'bg-gradient-to-r from-blue-500 to-cyan-500',
    'bg-gradient-to-r from-green-500 to-emerald-500',
    'bg-gradient-to-r from-orange-500 to-amber-500',
    'bg-gradient-to-r from-red-500 to-pink-500',
    'bg-gradient-to-r from-teal-500 to-blue-500',
    'bg-gradient-to-r from-violet-500 to-purple-500',
  ];
  // Available badge icons
  const badgeIconOptions = ['✨', '🔥', '⭐', '🎯', '💎', '🌟', '🎉', '🏆', '👑', '💫'];
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(response.data);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  const generatePermalink = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  const handleOpenModal = (category?: Category, parentId?: string | null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        subtitle: category.subtitle || '',
        highlightText: category.highlightText || '',
        description: category.description,
        image: category.imageUrl || category.image as string || '',
        imageFile: null,
        bgGradient: category.bgGradient || gradientOptions[0],
        badgeText: category.badgeText || '',
        badgeIcon: category.badgeIcon || '',
        order: category.order || 0,
        isActive: category.isActive !== false,
        parentId: category.parentId || null,
        showInCategoryGrid: category.showInCategoryGrid !== false,
        showInHero: category.showInHero || false,
        permalink: category.permalink || generatePermalink(category.name),
        primaryButtonText: category.primaryButtonText || '',
        primaryButtonLink: category.primaryButtonLink || '',
        secondaryButtonText: category.secondaryButtonText || '',
        secondaryButtonLink: category.secondaryButtonLink || '',
      });
      setImagePreview(category.imageUrl || category.image as string || null);
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        subtitle: '',
        highlightText: '',
        description: '',
        image: '',
        imageFile: null,
        bgGradient: gradientOptions[0],
        badgeText: '',
        badgeIcon: '',
        order: categories.length + 1,
        isActive: true,
        parentId: parentId || null,
        showInCategoryGrid: true,
        showInHero: false,
        permalink: '',
        primaryButtonText: '',
        primaryButtonLink: '',
        secondaryButtonText: '',
        secondaryButtonLink: '',
      });
      setImagePreview(null);
    }
    setSubmitError(null);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setSubmitError(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    // Auto-generate permalink from name
    if (name === 'name' && !editingCategory) {
      const permalink = generatePermalink(value);
      setFormData((prev) => ({
        ...prev,
        name: value,
        permalink: permalink,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageFile: null,
      image: '',
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('subtitle', formData.subtitle || '');
      formDataToSend.append('highlightText', formData.highlightText || '');
      formDataToSend.append('description', formData.description);
      formDataToSend.append('bgGradient', formData.bgGradient);
      formDataToSend.append('badgeText', formData.badgeText || '');
      formDataToSend.append('badgeIcon', formData.badgeIcon || '');
      formDataToSend.append('order', String(Number(formData.order)));
      formDataToSend.append('isActive', String(formData.isActive));
      formDataToSend.append('showInCategoryGrid', String(formData.showInCategoryGrid));
      formDataToSend.append('showInHero', String(formData.showInHero));
      formDataToSend.append('permalink', formData.permalink || generatePermalink(formData.name));
      formDataToSend.append('primaryButtonText', formData.primaryButtonText || '');
      formDataToSend.append('primaryButtonLink', formData.primaryButtonLink || '');
      formDataToSend.append('secondaryButtonText', formData.secondaryButtonText || '');
      formDataToSend.append('secondaryButtonLink', formData.secondaryButtonLink || '');
      if (formData.parentId) {
        formDataToSend.append('parentId', formData.parentId);
      }
      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      } else if (formData.image) {
        formDataToSend.append('imageUrl', formData.image);
      }
      if (editingCategory) {
        const response = await axios.put(`${API_BASE_URL}/categories/${editingCategory.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await fetchCategories();
      } else {
        const response = await axios.post(`${API_BASE_URL}/categories`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await fetchCategories();
      }
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setSubmitError(err.response?.data?.message || 'Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all subcategories.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      window.alert(err.response?.data?.message || 'Failed to delete category. Please try again.');
    }
  };
  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  const renderCategoryCard = (category: Category, level: number = 0) => {
    const hasSubCategories = category.subCategories && category.subCategories.length > 0;
    const isExpanded = expandedCategories.has(category.id!);
    const marginLeft = level * 24;
    return (
      <div key={category.id} style={{ marginLeft: `${marginLeft}px` }}>
        <div
          className={`${category.bgGradient || 'bg-gradient-to-r from-gray-500 to-gray-600'} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow relative group mb-4`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {category.badgeIcon && (
                  <span className="text-2xl">{category.badgeIcon}</span>
                )}
                {category.badgeText && (
                  <span className="text-xs font-medium bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    {category.badgeText}
                  </span>
                )}
                {category.parentId && (
                  <span className="text-xs font-medium bg-blue-500/30 backdrop-blur-sm px-2 py-1 rounded-full">
                    Subcategory
                  </span>
                )}
                {category.showInCategoryGrid !== false && (
                  <span className="text-xs font-medium bg-green-500/30 backdrop-blur-sm px-2 py-1 rounded-full">
                    Show in Grid
                  </span>
                )}
                {category.showInHero && (
                  <span className="text-xs font-medium bg-yellow-500/30 backdrop-blur-sm px-2 py-1 rounded-full">
                    Show in Hero
                  </span>
                )}
                {category.permalink && (
                  <span className="text-xs font-medium bg-purple-500/30 backdrop-blur-sm px-2 py-1 rounded-full">
                    /{category.permalink}
                  </span>
                )}
                {hasSubCategories && (
                  <button
                    onClick={() => toggleExpand(category.id!)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-auto"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              {category.imageUrl && (
                <div className="mb-3">
                  <img 
                    src={category.imageUrl} 
                    alt={category.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                </div>
              )}
              <h3 className="text-xl font-semibold mb-1">{category.name}</h3>
              {category.subtitle && (
                <p className="text-white/90 text-sm font-medium">{category.subtitle}</p>
              )}
              {category.highlightText && (
                <p className="text-yellow-300 text-sm font-semibold">{category.highlightText}</p>
              )}
              <p className="text-white/80 text-sm mt-1">{category.description}</p>
              {(category.primaryButtonText || category.secondaryButtonText) && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {category.primaryButtonText && (
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                      Primary: {category.primaryButtonText}
                    </span>
                  )}
                  {category.secondaryButtonText && (
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                      Secondary: {category.secondaryButtonText}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
                <span className={`px-2 py-1 rounded-full ${category.isActive ? 'bg-green-500/30 text-white' : 'bg-red-500/30 text-white'}`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="bg-white/20 px-2 py-1 rounded-full">
                  Order: {category.order}
                </span>
                {category.id && (
                  <button
                    onClick={() => handleOpenModal(undefined, category.id)}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                  >
                    <FolderPlus className="w-3 h-3" />
                    Add Subcategory
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenModal(category)}
                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                title="Edit category"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id!)}
                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-red-500/50 transition-colors"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
        </div>
        {hasSubCategories && isExpanded && (
          <div className="pl-4 border-l-2 border-white/10 ml-4">
            {category.subCategories!.map(subCat => renderCategoryCard(subCat, level + 1))}
          </div>
        )}
      </div>
    );
  };
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Category
          </button>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {categories.length === 0 ? (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
            <p className="text-purple-700 text-2xl font-semibold">No categories yet</p>
            <p className="text-gray-600 mt-2">Click "Add New Category" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories
              .filter(cat => !cat.parentId)
              .map(category => renderCategoryCard(category))}
          </div>
        )}
      </div>
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
                {formData.parentId && ' (Subcategory)'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter category name"
                  />
                </div>
                {/* Permalink */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permalink
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">/</span>
                    <input
                      type="text"
                      name="permalink"
                      value={formData.permalink}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="auto-generated-from-name"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    URL-friendly version of the category name. Auto-generated if left empty.
                  </p>
                </div>
                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Classic Collection"
                  />
                </div>
                {/* Highlight Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highlight Text
                  </label>
                  <input
                    type="text"
                    name="highlightText"
                    value={formData.highlightText}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Special Offer"
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter category description"
                  />
                </div>
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Image
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Image</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Or Image URL
                        </label>
                        <input
                          type="text"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    {imagePreview && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {/* Parent Category (for subcategories) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category (Leave empty for main category)
                  </label>
                  <select
                    name="parentId"
                    value={formData.parentId || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">None (Top Level Category)</option>
                    {categories
                      .filter(cat => !cat.parentId && cat.id !== editingCategory?.id)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                {/* Gradient */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Gradient *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {gradientOptions.map((gradient) => (
                      <button
                        key={gradient}
                        type="button"
                        onClick={() => setFormData({ ...formData, bgGradient: gradient })}
                        className={`h-12 rounded-lg transition-all ${
                          formData.bgGradient === gradient
                            ? 'ring-2 ring-purple-600 ring-offset-2 scale-105'
                            : 'hover:scale-105'
                        } ${gradient}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Badge Text & Icon */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      name="badgeText"
                      value={formData.badgeText}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Popular, New"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Badge Icon
                    </label>
                    <select
                      name="badgeIcon"
                      value={formData.badgeIcon}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {badgeIconOptions.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Primary & Secondary Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Button Text
                    </label>
                    <input
                      type="text"
                      name="primaryButtonText"
                      value={formData.primaryButtonText}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Shop Now"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Button Link
                    </label>
                    <input
                      type="text"
                      name="primaryButtonLink"
                      value={formData.primaryButtonLink}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="/store/categories/example"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Button Text
                    </label>
                    <input
                      type="text"
                      name="secondaryButtonText"
                      value={formData.secondaryButtonText}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., View Collection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Button Link
                    </label>
                    <input
                      type="text"
                      name="secondaryButtonLink"
                      value={formData.secondaryButtonLink}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="/store/categories/example/all"
                    />
                  </div>
                </div>
                {/* Order & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <label className="flex items-center gap-3 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                {/* Visibility Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <label className="flex items-center gap-3 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        name="showInCategoryGrid"
                        checked={formData.showInCategoryGrid}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Show in Category Grid</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hero Banner
                    </label>
                    <label className="flex items-center gap-3 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        name="showInHero"
                        checked={formData.showInHero}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Show in Hero Banners</span>
                    </label>
                  </div>
                </div>
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {submitError}
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingCategory ? 'Update' : 'Create'} Category
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Categories;
