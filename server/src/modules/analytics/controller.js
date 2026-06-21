import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import InterviewSession from "../../database/models/InterviewSession.js";

import logger from "../../utils/logger.js";
import AppError from "../../utils/AppError.js";

/**
 * Compile global/class-wide student skill data for a tutor.
 * This runs a MongoDB aggregation pipeline to count skill frequencies
 * and identify common skill gaps based on the tutor's specific candidate pool.
 */
export const getSkillGapHeatmap = async (req, res, next) => {
  try {
    // 1. Find the students this tutor is tracking
    const trackedProgress = await LearningProgress.find({ tutorsTracking: req.user._id }).select("user");
    const studentIds = trackedProgress.map(p => p.user);

    // If the tutor has no tracked students, return an empty array for placeholders
    if (studentIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const pipeline = [
      {
        $match: { user: { $in: studentIds } }
      },
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
    return next(new AppError("Failed to compile skill gap data", 500));
  }
};

/**
 * Dynamic Role-Specific Analytics Aggregation
 */
export const getDashboardAnalytics = async (req, res, next) => {
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
      // Find students tracked by this tutor
      const trackedProgress = await LearningProgress.find(
        { tutorsTracking: req.user._id },
        { user: 1 }
      ).lean();
      const trackedStudentIds = trackedProgress.map((p) => p.user);

      // If tutor has no tracked students, return zeroes immediately
      if (trackedStudentIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            role,
            averagePlatformScore: 0,
            totalMockInterviewsCompleted: 0,
            activeStudents: 0
          }
        });
      }

      const [result, activeStudents] = await Promise.all([
        InterviewSession.aggregate([
          { $match: { status: "completed", userId: { $in: trackedStudentIds } } },
          { $group: {
            _id: null,
            averagePlatformScore: { $avg: "$overallScore" },
            totalMockInterviewsCompleted: { $sum: 1 }
          }}
        ]),
        LearningProgress.countDocuments({
          user: { $in: trackedStudentIds },
          overallProgress: { $gt: 0 }
        })
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

    return next(new AppError("Role not recognized for analytics", 403));
  } catch (error) {
    logger.error("Error in getDashboardAnalytics:", error);
    return next(new AppError("Failed to fetch analytics", 500));
  }
};

/**
 * Fetch Audit Logs for Admin/Recruiter Analytics Dashboard
 */
export const getAuditStats = async (req, res, next) => {
  try {
    const { AuditLog } = await import("../../database/models/AuditLog.js");
    
    // Group by action and day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            action: "$action",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ];

    const results = await AuditLog.aggregate(pipeline);

    // Transform into a format friendly for Recharts
    // e.g. [ { date: '2026-06-01', LOGIN: 5, RESUME_UPLOAD: 2 }, ... ]
    const formattedData = {};
    const actions = new Set();

    results.forEach((item) => {
      const date = item._id.date;
      const action = item._id.action;
      
      if (!formattedData[date]) {
        formattedData[date] = { date };
      }
      formattedData[date][action] = item.count;
      actions.add(action);
    });

    const chartData = Object.values(formattedData).sort((a, b) => a.date.localeCompare(b.date));

    // Fill missing zeros for all actions on each date
    const actionList = Array.from(actions);
    chartData.forEach(day => {
      actionList.forEach(act => {
        if (day[act] === undefined) day[act] = 0;
      });
    });

    res.status(200).json({
      success: true,
      data: {
        chartData,
        actions: actionList
      }
    });
  } catch (error) {
    logger.error("Error fetching audit stats:", error);
    return next(new AppError("Failed to fetch audit stats", 500));
  }
};
