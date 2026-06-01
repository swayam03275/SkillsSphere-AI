import MatchScoreCard from "./MatchScoreCard";
import MissingSkillsList from "./MissingSkillsList";
import RecommendedJobsList from "./RecommendedJobsList";
export default function MatcherResult({ data }) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      
      <div className="col-span-1 space-y-4">
        <MatchScoreCard score={data.score} />
        <MissingSkillsList skills={data.missingSkills} />
      </div>

      <div className="col-span-2">
        <RecommendedJobsList jobs={data.jobs} />
      </div>
    </div>
  );
}