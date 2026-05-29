export default function RecommendedJobsList({ jobs }) {
  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-5 rounded-2xl shadow-xl text-gray-900 dark:text-white">
      
      <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-300">
        💼 Recommended Jobs
      </h3>

      <div className="space-y-4">
        {jobs.map((job, i) => (
          <div
            key={i}
            className="bg-gray-100 border border-gray-300 dark:bg-gray-800/80 dark:border-gray-700 p-4 rounded-xl  
                       hover:shadow-lg hover:scale-[1.02] transition duration-300"
          >
            {/* Job Title */}
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {job.title}
            </h4>

            {/* Company Badge */}
              <p className="inline-block mt-2 px-3 py-1 text-sm rounded-full 
                            bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300">
              {job.company}
            </p>

            {/* Match Score */}
            <p className="text-sm mt-3 text-green-700 dark:text-green-400 font-medium">
              Match: {job.score}%
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}