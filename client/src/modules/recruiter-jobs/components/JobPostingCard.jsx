import React from "react";
import PropTypes from "prop-types";
import { JobViewerCard } from "../../../shared/components";

const JobPostingCard = ({ className = "", ...props }) => (
  <JobViewerCard
    {...props}
    viewerRole="recruiter"
    className={className}
  />
);

JobPostingCard.propTypes = {
  job: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onViewStats: PropTypes.func,
  onViewApplicants: PropTypes.func,
  className: PropTypes.string,
};

export default JobPostingCard;
