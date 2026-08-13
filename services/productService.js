const { Product, ProductVariant, ProductImage, Category, sequelize } = require('../models');
const { Op } = require('sequelize');
// Helper to sanitize numeric fields: convert empty string to null (or 0 for required fields)
const sanitizeNumeric = (value, defaultValue = null) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};
// Helper to generate video URL from Cloudinary public ID if videoUrl is not set
const getVideoUrl = (product) => {
  if (product.videoUrl) return product.videoUrl;
  if (product.cloudinaryVideoPublicId) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      return `https://res.cloudinary.com/${cloudName}/video/upload/${product.cloudinaryVideoPublicId}`;
    }
  }
  return null;
};
const createProduct = async (data) => {
  const transaction = await sequelize.transaction();
  try {
    let finalSubcategoryId = data.subcategoryId ? parseInt(data.subcategoryId, 10) : null;
    if (finalSubcategoryId) {
      const subcategory = await Category.findOne({
        where: {
          id: finalSubcategoryId,
          parentId: { [Op.ne]: null }
        }
      });
      if (!subcategory) {
        console.warn(`Subcategory (category with parentId) with id ${finalSubcategoryId} not found. Setting to null.`);
        finalSubcategoryId = null;
      }
      if (finalSubcategoryId && data.categoryId) {
        const categoryId = parseInt(data.categoryId, 10);
        if (subcategory.parentId !== categoryId) {
          console.warn(`Subcategory ${finalSubcategoryId} does not belong to category ${categoryId}. Setting to null.`);
          finalSubcategoryId = null;
        }
      }
    }
    const basePrice = sanitizeNumeric(data.price || data.basePrice);
    const costPrice = sanitizeNumeric(data.costPrice);
    const stockQuantity = sanitizeNumeric(data.stockQuantity, 0);
    const videoLength = sanitizeNumeric(data.videoLength);
    const productData = {
      userId: data.userId,
      name: data.name,
      description: data.description,
      basePrice: basePrice,
      costPrice: costPrice,
      stockQuantity: stockQuantity,
      defaultSku: data.sku || data.defaultSku,
      categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
      subcategoryId: finalSubcategoryId,
      videoUrl: data.videoUrl,
      videoKitUrl: data.videoKitUrl || data.videoUrl,
      audioMode: data.audioMode || 'text',
      audioScript: data.audioScript,
      audioLanguage: data.audioLanguage,
      voiceGender: data.voiceGender,
      videoLength: videoLength,
      customAudioUrl: data.customAudioUrl,
      recordedAudioUrl: data.recordedAudioUrl,
      status: data.status || 'draft',
      cloudinaryVideoPublicId: data.cloudinaryVideoPublicId,
      cloudinaryAudioPublicId: data.cloudinaryAudioPublicId,
      showInFeaturedProducts: data.showInFeaturedProducts || false,
      showInBestSellers: data.showInBestSellers || false,
      showInNewArrivals: data.showInNewArrivals || false,
      showInPremiumProducts: data.showInPremiumProducts || false,
    };
    const product = await Product.create(productData, { transaction });
    // Ensure at least one variant; variant price falls back to product basePrice
    let variants = data.variants || [];
    if (variants.length === 0) {
      variants = [{
        sku: data.sku || data.defaultSku || 'default',
        size: '',
        color: '',
        price: basePrice || 0,
        costPrice: costPrice,
        stockQuantity: stockQuantity,
      }];
    }
    const variantData = variants.map(v => {
      let price = sanitizeNumeric(v.price, null);
      // If variant price is missing or zero, use product basePrice
      if (price === null || price === 0) {
        price = basePrice || 0;
      }
      const costPriceVar = sanitizeNumeric(v.costPrice);
      const stockQuantityVar = sanitizeNumeric(v.stockQuantity, 0);
      return {
        productId: product.id,
        sku: v.sku || data.sku || data.defaultSku || 'default',
        size: v.size || '',
        color: v.color || '',
        price: price,
        costPrice: costPriceVar,
        stockQuantity: stockQuantityVar,
      };
    });
    await ProductVariant.bulkCreate(variantData, { transaction });
    if (data.images && data.images.length > 0) {
      const imageData = data.images.map((url, index) => ({
        productId: product.id,
        url,
        position: index,
      }));
      await ProductImage.bulkCreate(imageData, { transaction });
    }
    await transaction.commit();
    const fullProduct = await Product.findByPk(product.id, {
      include: [
        { model: ProductVariant, as: 'variants' },
        { model: ProductImage, as: 'images' },
        { model: Category, as: 'category' },
        { model: Category, as: 'subcategory' },
      ],
    });
    if (fullProduct) {
      fullProduct.videoUrl = getVideoUrl(fullProduct);
    }
    return fullProduct;
  } catch (error) {
    if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
      await transaction.rollback();
    }
    throw error;
  }
};
const getProducts = async (userId) => {
  const products = await Product.findAll({
    where: { userId },
    include: [
      { model: ProductVariant, as: 'variants' },
      { model: ProductImage, as: 'images' },
      { model: Category, as: 'category' },
      { model: Category, as: 'subcategory' },
    ],
    order: [['createdAt', 'DESC']],
  });
  products.forEach(product => {
    product.videoUrl = getVideoUrl(product);
  });
  return products;
};
const getProduct = async (id) => {
  const product = await Product.findByPk(id, {
    include: [
      { model: ProductVariant, as: 'variants' },
      { model: ProductImage, as: 'images' },
      { model: Category, as: 'category' },
      { model: Category, as: 'subcategory' },
    ],
  });
  if (product) {
    product.videoUrl = getVideoUrl(product);
  }
  return product;
};
const updateProduct = async (id, data) => {
  const transaction = await sequelize.transaction();
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
      }
      return null;
    }
    let finalSubcategoryId = data.subcategoryId ? parseInt(data.subcategoryId, 10) : null;
    if (finalSubcategoryId) {
      const subcategory = await Category.findOne({
        where: {
          id: finalSubcategoryId,
          parentId: { [Op.ne]: null }
        }
      });
      if (!subcategory) {
        console.warn(`Subcategory (category with parentId) with id ${finalSubcategoryId} not found. Setting to null.`);
        finalSubcategoryId = null;
      }
      if (finalSubcategoryId && data.categoryId) {
        const categoryId = parseInt(data.categoryId, 10);
        if (subcategory.parentId !== categoryId) {
          console.warn(`Subcategory ${finalSubcategoryId} does not belong to category ${categoryId}. Setting to null.`);
          finalSubcategoryId = null;
        }
      }
    }
    const basePrice = sanitizeNumeric(data.price || data.basePrice);
    const costPrice = sanitizeNumeric(data.costPrice);
    const stockQuantity = sanitizeNumeric(data.stockQuantity, 0);
    const videoLength = sanitizeNumeric(data.videoLength);
    const productData = {
      userId: data.userId,
      name: data.name,
      description: data.description,
      basePrice: basePrice,
      costPrice: costPrice,
      stockQuantity: stockQuantity,
      defaultSku: data.sku || data.defaultSku,
      categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
      subcategoryId: finalSubcategoryId,
      videoUrl: data.videoUrl,
      videoKitUrl: data.videoKitUrl || data.videoUrl,
      audioMode: data.audioMode || 'text',
      audioScript: data.audioScript,
      audioLanguage: data.audioLanguage,
      voiceGender: data.voiceGender,
      videoLength: videoLength,
      customAudioUrl: data.customAudioUrl,
      recordedAudioUrl: data.recordedAudioUrl,
      status: data.status || 'draft',
      cloudinaryVideoPublicId: data.cloudinaryVideoPublicId,
      cloudinaryAudioPublicId: data.cloudinaryAudioPublicId,
      showInFeaturedProducts: data.showInFeaturedProducts !== undefined ? data.showInFeaturedProducts : product.showInFeaturedProducts,
      showInBestSellers: data.showInBestSellers !== undefined ? data.showInBestSellers : product.showInBestSellers,
      showInNewArrivals: data.showInNewArrivals !== undefined ? data.showInNewArrivals : product.showInNewArrivals,
      showInPremiumProducts: data.showInPremiumProducts !== undefined ? data.showInPremiumProducts : product.showInPremiumProducts,
    };
    await product.update(productData, { transaction });
    if (data.variants !== undefined) {
      await ProductVariant.destroy({
        where: { productId: id },
        transaction
      });
      let variants = data.variants || [];
      if (variants.length === 0) {
        const currentPrice = productData.basePrice != null ? productData.basePrice : (product.basePrice || 0);
        const currentCostPrice = productData.costPrice != null ? productData.costPrice : product.costPrice;
        const currentStock = productData.stockQuantity != null ? productData.stockQuantity : (product.stockQuantity || 0);
        variants = [{
          sku: product.defaultSku || productData.defaultSku || 'default',
          size: '',
          color: '',
          price: currentPrice,
          costPrice: currentCostPrice,
          stockQuantity: currentStock,
        }];
      }
      const effectiveBase = productData.basePrice != null ? productData.basePrice : (product.basePrice || 0);
      const variantData = variants.map(v => {
        let price = sanitizeNumeric(v.price, null);
        if (price === null || price === 0) {
          price = effectiveBase || 0;
        }
        const costPriceVar = sanitizeNumeric(v.costPrice);
        const stockQuantityVar = sanitizeNumeric(v.stockQuantity, 0);
        return {
          productId: id,
          sku: v.sku || product.defaultSku || 'default',
          size: v.size || '',
          color: v.color || '',
          price: price,
          costPrice: costPriceVar,
          stockQuantity: stockQuantityVar,
        };
      });
      await ProductVariant.bulkCreate(variantData, { transaction });
    } else {
      // Even when variants are not sent, keep default variant price in sync with basePrice
      // for products that effectively have no variant configuration.
      const existingVariants = await ProductVariant.findAll({
        where: { productId: id },
        transaction,
      });
      if (existingVariants.length === 0) {
        const price = productData.basePrice != null ? productData.basePrice : (product.basePrice || 0);
        await ProductVariant.create({
          productId: id,
          sku: product.defaultSku || productData.defaultSku || 'default',
          size: '',
          color: '',
          price: price || 0,
          costPrice: productData.costPrice != null ? productData.costPrice : product.costPrice,
          stockQuantity: productData.stockQuantity != null ? productData.stockQuantity : (product.stockQuantity || 0),
        }, { transaction });
      } else if (existingVariants.length === 1) {
        const only = existingVariants[0];
        const looksLikeDefault =
          (!only.size || only.size === '') &&
          (!only.color || only.color === '');
        const effectiveBase = productData.basePrice != null ? productData.basePrice : (product.basePrice || 0);
        if (looksLikeDefault && effectiveBase != null && toNumberSafe(only.price) !== toNumberSafe(effectiveBase)) {
          await only.update({ price: effectiveBase || 0 }, { transaction });
        }
      }
    }
    if (data.images !== undefined) {
      await ProductImage.destroy({
        where: { productId: id },
        transaction
      });
      if (data.images && data.images.length > 0) {
        const imageData = data.images.map((url, index) => ({
          productId: id,
          url,
          position: index,
        }));
        await ProductImage.bulkCreate(imageData, { transaction });
      }
    }
    await transaction.commit();
    const fullProduct = await Product.findByPk(id, {
      include: [
        { model: ProductVariant, as: 'variants' },
        { model: ProductImage, as: 'images' },
        { model: Category, as: 'category' },
        { model: Category, as: 'subcategory' },
      ],
    });
    if (fullProduct) {
      fullProduct.videoUrl = getVideoUrl(fullProduct);
    }
    return fullProduct;
  } catch (error) {
    if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
      await transaction.rollback();
    }
    throw error;
  }
};
const toNumberSafe = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};
const deleteProduct = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) {
    return false;
  }
  await product.destroy();
  return true;
};
module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct };
