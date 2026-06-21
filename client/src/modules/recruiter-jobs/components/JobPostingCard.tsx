
import React from "react";
import { JobViewerCard } from "../../../shared/components";

export interface JobPostingCardProps {
  job: Record<string, any>;
  onEdit?: (...args: any[]) => any;
  onDelete?: (...args: any[]) => any;
  onViewStats?: (...args: any[]) => any;
  onViewApplicants?: (...args: any[]) => any;
  className?: string;
}


const JobPostingCard = ({ className = "", ...props }) => (
  // @ts-expect-error TODO: Fix pervasive types
  <JobViewerCard
    {...props}
    viewerRole="recruiter"
    className={className}
  />
);


export default JobPostingCard;
