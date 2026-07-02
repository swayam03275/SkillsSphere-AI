import MatchScoreCard from "./MatchScoreCard";
import MissingSkillsList from "./MissingSkillsList";
import RecommendedJobsList from "./RecommendedJobsList";
import { JobPosting } from "../../../types";

export interface MatcherResultData {
  score?: number;
  missingSkills?: string[];
  jobs?: JobPosting[];
  error?: string;
  isLoading?: boolean;
}

export interface MatcherResultProps {
  data: MatcherResultData;
  onRetry?: () => void;
}

export default function MatcherResult({ data, onRetry }: MatcherResultProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      
      <div className="col-span-1 space-y-4">
        <MatchScoreCard 
          score={data.score || 0} 
          error={data.error} 
          isLoading={data.isLoading} 
          onRetry={onRetry} 
        />
        <MissingSkillsList skills={data.missingSkills} />
      </div>

      <div className="col-span-2">
        <RecommendedJobsList jobs={data.jobs} />
      </div>
    </div>
  );
}