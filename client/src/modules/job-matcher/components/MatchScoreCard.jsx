export default function MatchScoreCard({ score }) {
  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-6 rounded-2xl shadow-xl text-gray-900 dark:text-white text-center">

      {/* Heading */}
      <h3 className="text-lg font-semibold mb-4 text-indigo-600 dark:text-indigo-300">
        🎯 Match Score
      </h3>

      {/* Score Number */}
      <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 dark:from-blue-400 to-indigo-500 dark:to-indigo-400 text-transparent bg-clip-text">
        {score}%
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded mt-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>

    </div>
  );
}