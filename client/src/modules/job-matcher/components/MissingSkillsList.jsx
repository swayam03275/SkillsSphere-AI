const MissingSkillsList = ({ skills }) => {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-5 rounded-2xl shadow-xl text-gray-900 dark:text-white">
      
      {/* Heading */}
      <h3 className="text-lg font-semibold mb-4 text-pink-600 dark:text-pink-300 flex items-center gap-2">
        💗 Missing Skills
      </h3>

      {/* Skills */}
      <div className="flex flex-wrap gap-3">
        {skills.map((skill, i) => (
          <span
            key={i}
            className="px-4 py-1.5 text-sm rounded-full 
                       bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-400/30
                       hover:bg-pink-500/30 dark:hover:bg-black dark:hover:text-white hover:border-pink-500/50 dark:hover:border-gray-600
                       transition duration-300 cursor-pointer"
          >
            {skill}
          </span>
        ))}
      </div>

    </div>
  );
};

export default MissingSkillsList;