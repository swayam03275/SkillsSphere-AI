export const matchCandidates = async (req, res) => {
  try {
    // dummy response
    res.json({
      success: true,
      message: "Matched candidates fetched",
      data: []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMatchResults = async (req, res) => {
  try {
    const { jobId } = req.params;

    res.json({
      success: true,
      message: `Match results for job ${jobId}`,
      data: []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};