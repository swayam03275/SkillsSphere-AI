import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";

/**
 * Compile global/class-wide student skill data.
 * This runs a MongoDB aggregation pipeline to count skill frequencies
 * and identify common skill gaps based on the candidate pool.
 */
export const getSkillGapHeatmap = async (req, res) => {
  try {
    const pipeline = [
      {
        $project: { skills: 1 }
      },
      {
        $unwind: "$skills"
      },
      {
        $group: {
          _id: { $toLower: "$skills" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 30
      }
    ];

    const aggregatedSkills = await Resume.aggregate(pipeline);
    
    // Map the results for the Recharts Treemap and Bar charts
    const chartData = aggregatedSkills.map(skill => ({
      name: skill._id.charAt(0).toUpperCase() + skill._id.slice(1),
      count: skill.count,
      // Create a mock "gap score" for the heatmap where lower frequency means higher gap
      gapScore: Math.max(1, 100 - (skill.count * 10))
    }));

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error("Error in getSkillGapHeatmap aggregation:", error);
    res.status(500).json({ success: false, message: "Failed to compile skill gap data" });
  }
};
