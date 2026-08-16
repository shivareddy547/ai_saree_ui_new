const socialService = require('../services/socialService');
/**
 * GET /api/social/oauth-url/:providerId
 */
exports.getOAuthUrl = async (req, res) => {
  try {
    const { providerId } = req.params;
    const userId = req.user.id;
    const redirectUri = req.query.redirectUri || req.query.redirect_uri;
    const data = await socialService.getOAuthUrl(providerId, userId, redirectUri);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getOAuthUrl error:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }
};
/**
 * POST /api/social/connect
 */
exports.connect = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, state, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
        message: 'Authorization code is required',
      });
    }
    const result = await socialService.connect(userId, { code, state, redirectUri });
    return res.json(result);
  } catch (err) {
    console.error('connect error:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }
};
/**
 * GET /api/social/status
 */
exports.status = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await socialService.getStatus(userId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('status error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }
};
/**
 * DELETE /api/social/disconnect/:connectionId
 */
exports.disconnect = async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;
    await socialService.disconnect(userId, connectionId);
    return res.json({ success: true, message: 'Disconnected successfully' });
  } catch (err) {
    console.error('disconnect error:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }
};
/**
 * POST /api/social/post
 * Body: { providerId, video_url, media_type, caption, title?, privacyStatus? }
 */
exports.post = async (req, res) => {
  try {
    const userId = req.user.id;
    const { providerId, video_url, media_type, caption, title, privacyStatus } = req.body;
    if (!providerId || !video_url) {
      return res.status(400).json({
        success: false,
        error: 'providerId and video_url are required',
        message: 'providerId and video_url are required',
      });
    }
    const result = await socialService.postVideo(userId, {
      providerId,
      video_url,
      media_type,
      caption,
      title,
      privacyStatus,
    });
    return res.json(result);
  } catch (err) {
    console.error('social post error:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }
};
