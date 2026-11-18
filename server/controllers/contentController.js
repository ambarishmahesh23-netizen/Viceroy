import ResortContent from "../models/ResortContent.js";

// GET /api/content/resort - Public
export const getResortContent = async (req, res) => {
  try {
    let content = await ResortContent.findOne();
    if (!content) {
      content = await ResortContent.create({});
    }
    return res.status(200).json({
      success: true,
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resort content",
      error: error.message,
    });
  }
};

// PUT /api/content/resort - Admin only
export const updateResortContent = async (req, res) => {
  try {
    let content = await ResortContent.findOne();
    if (!content) {
      content = new ResortContent(req.body);
    } else {
      Object.assign(content, req.body);
    }
    await content.save();

    return res.status(200).json({
      success: true,
      message: "Resort website content updated successfully",
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update resort content",
      error: error.message,
    });
  }
};
