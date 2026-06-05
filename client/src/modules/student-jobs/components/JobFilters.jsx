import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Search, Filter, Calendar, IndianRupee, X } from "lucide-react";
import Input from "../../../shared/components/Input";
import Select from "../../../shared/components/Select";
const JobFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    designation: "",
    minSalary: "",
    maxSalary: "",
    postedWithin: "",
  });

  const [debouncedDesignation, setDebouncedDesignation] = useState("");
  // State for salary range validation message
  const [salaryError, setSalaryError] = useState("");

  // Debounce designation search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDesignation(filters.designation);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.designation]);

  // Prevent invalid salary filters from triggering API calls
  useEffect(() => {
    if(salaryError) return;

    onFilterChange({
      ...filters,
      designation: debouncedDesignation,
    });
  }, [ debouncedDesignation,filters.minSalary,filters.maxSalary, filters.postedWithin, salaryError,]);


  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...filters,
      [name]: value,
    };
    setFilters(updatedFilters);
    // Validate salary range before applying filters
    const min = Number(updatedFilters.minSalary);
    const max = Number(updatedFilters.maxSalary);

    if(updatedFilters.minSalary && updatedFilters.maxSalary && min>max) {
      setSalaryError("Minimum salary cannot be greater than maximum salary");
    }
    else {
      setSalaryError("");
    }
  };

  const handleClear = () => {
    setFilters({
      designation: "",
      minSalary: "",
      maxSalary: "",
      postedWithin: "",
    });
    // Reset salary validation state when clearing filters
    setSalaryError("");
  };
  // Check whether any job filters are currently active
  const hasActiveFilters = filters.designation || filters.minSalary || filters.maxSalary || filters.postedWithin;

  const dateOptions = [
    { value: "", label: "Anytime" },
    { value: "1d", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 h-fit sticky top-28 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Filter size={20} className="text-blue-500" />
          Filters
        </h2>
        <button
          onClick={handleClear}
          disabled={!hasActiveFilters}
          className={`text-xs font-medium flex items-center gap-1 transition-colors ${
            hasActiveFilters 
            ? "text-slate-400 hover:text-white cursor-pointer" 
            : "text-slate-600 cursor-not-allowed opacity-50"
          }`}
        >
          <X size={14} />
          Clear All
        </button>
      </div>

      <div className="space-y-6">
        {/* Designation */}
        <div>
          <label htmlFor="filter-designation" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Designation
          </label>
          <Input
            id="filter-designation"
            name="designation"
            value={filters.designation}
            onChange={handleChange}
            placeholder="e.g. Software Engineer"
            leftIcon={<Search size={18} />}
            className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-white/5 focus:border-blue-500/50 text-gray-900 dark:text-white"
          />
        </div>

        {/* Salary Range */}
        <div>
          <label htmlFor="filter-min-salary" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Expected Salary (₹)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="filter-min-salary"
              type="number"
              name="minSalary"
              value={filters.minSalary}
              onChange={handleChange}
              placeholder="Min"
              className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-white/5 focus:border-blue-500/50 text-gray-900 dark:text-white"
            />
            <Input
              id="filter-max-salary"
              type="number"
              name="maxSalary"
              value={filters.maxSalary}
              onChange={handleChange}
              placeholder="Max"
              className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-white/5 focus:border-blue-500/50 text-gray-900 dark:text-white"
            />
          </div>
        </div>


        {/* Salary validation feedback */}
        {salaryError && (
          <p className="text-red-400 text-sm mt-2"> {salaryError} </p>
        )}

        {/* Date Posted */}
        <div>
          <label htmlFor="filter-date-posted" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Date Posted
          </label>
          <Select
            id="filter-date-posted"
            name="postedWithin"
            value={filters.postedWithin}
            onChange={handleChange}
            options={dateOptions}
            placeholder="Anytime"
            className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-white/5 focus:border-blue-500/50 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-500/5 rounded-xl border border-blue-300 dark:border-blue-500/10">
        <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
          <span className="font-bold">Pro Tip:</span> Refine your search to find jobs matching your skill set more accurately.
        </p>
      </div>
    </div>
  );
};

JobFilters.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default JobFilters;
