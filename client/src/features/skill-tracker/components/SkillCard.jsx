import ProgressBar from "./ProgressBar";

const SkillCard = ({ skill, onComplete }) => {
  return (
    <div className="bg-white shadow-lg rounded-xl p-5 border">
      <h2 className="text-xl font-bold">{skill.title}</h2>

      <p className="text-gray-500">{skill.category}</p>

      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
        {skill.difficulty}
      </span>

      <ProgressBar progress={skill.progress} />

      <p className="mt-2 text-sm">
        Progress: {skill.progress}%
      </p>

      {!skill.completed ? (
        <button
          onClick={() => onComplete(skill.id)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Mark Completed
        </button>
      ) : (
        <p className="mt-4 text-green-600 font-semibold">
          Completed ✅
        </p>
      )}
    </div>
  );
};

export default SkillCard;