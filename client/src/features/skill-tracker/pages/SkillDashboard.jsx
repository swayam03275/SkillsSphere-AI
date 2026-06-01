import { useEffect, useState } from "react";
import SkillCard from "../components/SkillCard";
import skillsData from "../data/skillsData";

const SkillDashboard = () => {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    const storedSkills = localStorage.getItem("skills");

    if (storedSkills) {
      setSkills(JSON.parse(storedSkills));
    } else {
      setSkills(skillsData);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("skills", JSON.stringify(skills));
  }, [skills]);

  const handleComplete = (id) => {
    const updatedSkills = skills.map((skill) =>
      skill.id === id
        ? {
            ...skill,
            completed: true,
            progress: 100,
          }
        : skill
    );

    setSkills(updatedSkills);
  };

  const completedSkills = skills.filter(
    (skill) => skill.completed
  ).length;

  const progressPercentage =
    skills.length > 0
      ? Math.round((completedSkills / skills.length) * 100)
      : 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Skill Tracking Dashboard
      </h1>

      <div className="mb-6 bg-gray-100 p-4 rounded-xl">
        <p className="text-lg font-semibold">
          Overall Progress: {progressPercentage}%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onComplete={handleComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default SkillDashboard;