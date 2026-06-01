import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import InterviewSession from "../../database/models/InterviewSession.js";

import logger from "../../utils/logger.js";

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
    logger.error("Error in getSkillGapHeatmap aggregation:", error);
    res.status(500).json({ success: false, message: "Failed to compile skill gap data" });
  }
};

/**
 * Dynamic Role-Specific Analytics Aggregation
 */
export const getDashboardAnalytics = async (req, res) => {
  try {
    const role = req.user.role;
    
    if (role === "student") {
      // Student: Overall topic mastery based on LearningProgress
      const progress = await LearningProgress.findOne({ user: req.user._id }).lean();
      const interviews = await InterviewSession.find({ userId: req.user._id, status: "completed" }).lean();
      
      const averageInterviewScore = interviews.length > 0 
        ? Math.round(interviews.reduce((acc, curr) => acc + curr.overallScore, 0) / interviews.length)
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          role,
          roadmapProgress: progress ? progress.overallProgress : 0,
          averageInterviewScore,
          totalInterviews: interviews.length,
          completedTopics: progress?.roadmap?.filter(t => t.status === "completed").length || 0
        }
      });
    } 
    
    if (role === "tutor") {
  const [result, activeStudents] = await Promise.all([
    InterviewSession.aggregate([
      { $match: { status: "completed" } },
      { $group: {
        _id: null,
        averagePlatformScore: { $avg: "$overallScore" },
        totalMockInterviewsCompleted: { $sum: 1 }
      }}
    ]),
    LearningProgress.countDocuments({ overallProgress: { $gt: 0 } })
  ]);

  const averagePlatformScore = result[0]
    ? Math.round(result[0].averagePlatformScore)
    : 0;
  const totalMockInterviewsCompleted = result[0]?.totalMockInterviewsCompleted || 0;

  return res.status(200).json({
    success: true,
    data: {
      role,
      averagePlatformScore,
      totalMockInterviewsCompleted,
      activeStudents
    }
  });
}

    if (role === "recruiter") {
      // Recruiter: Talent pool density map
      const highlySkilled = await InterviewSession.aggregate([
        { $match: { status: "completed", overallScore: { $gte: 80 } } },
        { $group: { _id: "$topic", count: { $sum: 1 } } }
      ]);
      
      const densityMap = highlySkilled.map(t => ({ topic: t._id, skilledCandidates: t.count }));
      
      return res.status(200).json({
        success: true,
        data: {
          role,
          talentDensity: densityMap,
          totalEliteCandidates: densityMap.reduce((acc, curr) => acc + curr.skilledCandidates, 0)
        }
      });
    }

    res.status(403).json({ success: false, message: "Role not recognized for analytics" });
  } catch (error) {
    logger.error("Error in getDashboardAnalytics:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};
